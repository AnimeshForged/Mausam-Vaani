
export function detectQueryLanguage(text: string): 'hi' | 'en' {
  if (!text || !text.trim()) return 'hi';

  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  const clean = text.toLowerCase().trim();

  const hindiKeywords = [
    'kya', 'kyun', 'kyu', 'kaise', 'kaisa', 'kaisi', 'kab', 'kahan', 'kaha',
    'kitna', 'kitni', 'kitne', 'kaun', 'kaunsa', 'kaunsi', 'kis', 'kisko', 'kisse',
    'kal', 'aaj', 'parso', 'parson', 'tarso', 'subah', 'dopahar', 'shaam', 'sham', 'raat',
    'hafte', 'mahine', 'samay', 'waqt', 'din',
    'pani', 'paani', 'barish', 'barsat', 'badal', 'hava', 'hawa', 'aandhi', 'toofan',
    'dhoop', 'thand', 'sardi', 'garmi', 'mausam', 'tapman', 'kohra', 'ole', 'gira', 'girne',
    'hogi', 'hoga', 'honge', 'rahega', 'rahegi', 'rahenge', 'aayegi', 'aayega', 'padega', 'padegi',
    'kheti', 'fasal', 'faslo', 'kisan', 'kisano', 'soya', 'soyabean', 'dhan', 'gehu', 'pyaj',
    'lahsun', 'kapas', 'mitti', 'urvarak', 'khad', 'sinchai', 'dawa', 'dawai', 'keeda', 'keede',
    'rog', 'bimari', 'kheto', 'khet', 'mandee', 'mandi', 'chhidkaw', 'chhidkao', 'chhidkav',
    'buwai', 'katai', 'beej', 'rakba', 'bhav', 'daam', 'upaj',
    'namaste', 'namaskar', 'pranam', 'ram', 'bhai', 'sahab', 'ji', 'batao', 'bataiye', 'bolie',
    'suno', 'kare', 'karein', 'karo', 'karna', 'sakte', 'sakta', 'sakti', 'chahiye',
    'hai', 'hain', 'hoon', 'tha', 'thi', 'the', 'nahi', 'mat', 'theek', 'achha', 'bahut', 'jyada', 'kam'
  ];

  const words = clean.split(/[\s,?.!;:()"\-]+/).filter(Boolean);
  let hindiWordCount = 0;
  for (const w of words) {
    if (hindiKeywords.includes(w)) {
      hindiWordCount++;
    }
  }

  if (hindiWordCount >= 2 || (hindiWordCount >= 1 && words.length <= 3)) {
    return 'hi';
  }

  return 'en';
}

export interface StartListeningOptions {
  onResult: (transcript: string, audioBlob?: Blob) => void;
  onInterim?: (interimTranscript: string) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  lang?: 'hi-IN' | 'en-IN';
  pauseTimeoutMs?: number;
  initialTimeoutMs?: number;
  maxDurationMs?: number;
}

export class SpeechHandler {
  private static recognitionInstance: any = null;
  private static isSpeaking: boolean = false;
  private static isListeningActive: boolean = false;
  private static accumulatedTranscript: string = '';
  private static silenceTimer: any = null;
  private static maxDurationTimer: any = null;
  private static onFinalResultCallback: ((transcript: string, audioBlob?: Blob) => void) | null = null;
  private static onInterimCallback: ((interim: string) => void) | null = null;
  private static onErrorCallback: ((err: any) => void) | null = null;
  private static onEndCallback: (() => void) | null = null;
  private static onVolumeChangeCallback: ((volume: number) => void) | null = null;

  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static resumeInterval: any = null;
  private static activeAudioElement: HTMLAudioElement | null = null;
  private static ttsAudioContext: AudioContext | null = null;
  private static currentBufferSource: AudioBufferSourceNode | null = null;
  private static activeSessionId: number = 0;
  private static currentAbortController: AbortController | null = null;

  private static activeMediaStream: MediaStream | null = null;
  private static mediaRecorder: MediaRecorder | null = null;
  private static recordedChunks: Blob[] = [];
  private static audioContext: AudioContext | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static volumeCheckRaf: number | null = null;
  private static isCloudSttBlocked: boolean = false;

  static isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  static isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  static async startListening(
    onResultOrOptions: ((transcript: string, audioBlob?: Blob) => void) | StartListeningOptions,
    onError?: (err: any) => void,
    lang: 'hi-IN' | 'en-IN' = 'hi-IN',
    onInterim?: (interim: string) => void
  ): Promise<() => void> {
    let opts: StartListeningOptions;
    if (typeof onResultOrOptions === 'function') {
      opts = {
        onResult: onResultOrOptions,
        onError,
        lang: lang || 'hi-IN',
        onInterim,
        pauseTimeoutMs: 3000,
        initialTimeoutMs: 15000,
        maxDurationMs: 45000,
      };
    } else {
      opts = {
        pauseTimeoutMs: 3000,
        initialTimeoutMs: 15000,
        maxDurationMs: 45000,
        ...onResultOrOptions,
        lang: onResultOrOptions.lang || 'hi-IN',
      };
    }

    this.stopListening(false);

    this.stopSpeaking();
    this.prewarmAudio();

    this.isListeningActive = true;
    this.accumulatedTranscript = '';
    this.recordedChunks = [];
    this.isCloudSttBlocked = false;
    this.onFinalResultCallback = opts.onResult;
    this.onInterimCallback = opts.onInterim || null;
    this.onErrorCallback = opts.onError || null;
    this.onEndCallback = opts.onEnd || null;
    this.onVolumeChangeCallback = opts.onVolumeChange || null;

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.activeMediaStream = stream;

        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            this.audioContext = new AudioCtx();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            source.connect(this.analyserNode);

            const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
            const updateVolume = () => {
              if (!this.isListeningActive || !this.analyserNode) return;
              this.analyserNode.getByteFrequencyData(buffer);
              let sum = 0;
              for (let i = 0; i < buffer.length; i++) {
                sum += buffer[i];
              }
              const avg = sum / buffer.length;
              const normalized = Math.min(100, Math.round((avg / 128) * 100));
              if (this.onVolumeChangeCallback) {
                this.onVolumeChangeCallback(normalized);
              }
              this.volumeCheckRaf = requestAnimationFrame(updateVolume);
            };
            this.volumeCheckRaf = requestAnimationFrame(updateVolume);
          }
        } catch (audioErr) {
          console.warn('[SpeechHandler] AudioContext initialization skipped:', audioErr);
        }

        try {
          if (typeof MediaRecorder !== 'undefined') {
            let selectedMime = '';
            const candidates = [
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/mp4',
              'audio/ogg',
            ];
            for (const mime of candidates) {
              if (MediaRecorder.isTypeSupported(mime)) {
                selectedMime = mime;
                break;
              }
            }

            const recorder = selectedMime
              ? new MediaRecorder(stream, { mimeType: selectedMime })
              : new MediaRecorder(stream);

            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
              }
            };
            recorder.start(250);
            this.mediaRecorder = recorder;
          }
        } catch (recorderErr) {
          console.warn('[SpeechHandler] MediaRecorder backup unavailable:', recorderErr);
        }
      }
    } catch (permErr: any) {
      console.warn('[SpeechHandler] getUserMedia microphone permission error:', permErr);
      if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
        this.isListeningActive = false;
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error('Microphone permission denied. Please allow microphone access.'));
        }
        return () => {};
      }
    }

    const clearTimers = () => {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (this.maxDurationTimer) {
        clearTimeout(this.maxDurationTimer);
        this.maxDurationTimer = null;
      }
    };

    this.maxDurationTimer = setTimeout(() => {
      if (this.isListeningActive) {
        console.log('[SpeechHandler] Max duration reached, finalizing.');
        this.finalizeAndSubmit();
      }
    }, opts.maxDurationMs || 45000);

    if (this.isRecognitionSupported()) {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRec();
      this.recognitionInstance = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = opts.lang || 'hi-IN';

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0]) {
            if (res.isFinal) {
              finalChunk += res[0].transcript + ' ';
            } else {
              interimChunk += res[0].transcript;
            }
          }
        }

        const currentText = (finalChunk + interimChunk).trim();
        if (currentText) {
          this.accumulatedTranscript = currentText;

          if (this.onInterimCallback) {
            this.onInterimCallback(currentText);
          }

          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.isListeningActive && this.accumulatedTranscript.trim()) {
              console.log('[SpeechHandler] Natural pause detected, finalizing query:', this.accumulatedTranscript);
              this.finalizeAndSubmit();
            }
          }, opts.pauseTimeoutMs || 3000);
        }
      };

      recognition.onerror = (event: any) => {
        console.log('[SpeechHandler] recognition.onerror:', event.error);

        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        if (event.error === 'network') {
          console.log('[SpeechHandler] Cloud STT offline or restricted. Continuing in direct audio recorder mode.');
          this.isCloudSttBlocked = true;
          if (this.onInterimCallback && !this.accumulatedTranscript) {
            this.onInterimCallback(
              opts.lang === 'hi-IN'
                ? 'आवाज़ रिकॉर्ड हो रही है... बोलते रहें'
                : 'Recording your voice... keep speaking'
            );
          }
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isListeningActive = false;
          clearTimers();
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error('Microphone access blocked. Please allow microphone permission.'));
          }
          return;
        }

        console.warn('[SpeechHandler] Non-fatal recognition event:', event.error);
      };

      recognition.onend = () => {
        console.log('[SpeechHandler] recognition.onend. isListeningActive:', this.isListeningActive, 'cloudBlocked:', this.isCloudSttBlocked);

        if (this.isListeningActive && !this.isCloudSttBlocked) {
          setTimeout(() => {
            if (this.isListeningActive && this.recognitionInstance && !this.isCloudSttBlocked) {
              try {
                this.recognitionInstance.start();
              } catch (restartErr) {
                console.log('[SpeechHandler] Seamless restart deferred:', restartErr);
              }
            }
          }, 200);
        }
      };

      try {
        recognition.start();
      } catch (startErr) {
        console.warn('[SpeechHandler] Recognition start notice:', startErr);
      }
    } else {
      console.log('[SpeechHandler] Web Speech API recognition not available in this browser; using MediaRecorder.');
      if (this.onInterimCallback) {
        this.onInterimCallback(
          opts.lang === 'hi-IN'
            ? 'आवाज़ रिकॉर्ड हो रही है... बोलते रहें'
            : 'Recording your voice... keep speaking'
        );
      }
    }

    return () => {
      this.stopListening(true);
    };
  }

  private static async flushAndGetAudioBlob(): Promise<Blob | undefined> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      if (this.recordedChunks.length > 0) {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        return new Blob(this.recordedChunks, { type: mimeType });
      }
      return undefined;
    }

    return new Promise<Blob | undefined>((resolve) => {
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';

      const timeout = setTimeout(() => {
        if (this.recordedChunks.length > 0) {
          resolve(new Blob(this.recordedChunks, { type: mimeType }));
        } else {
          resolve(undefined);
        }
      }, 400);

      this.mediaRecorder!.onstop = () => {
        clearTimeout(timeout);
        if (this.recordedChunks.length > 0) {
          resolve(new Blob(this.recordedChunks, { type: mimeType }));
        } else {
          resolve(undefined);
        }
      };

      try {
        if (this.mediaRecorder!.state === 'recording') {
          this.mediaRecorder!.requestData();
        }
        this.mediaRecorder!.stop();
      } catch {
        clearTimeout(timeout);
        if (this.recordedChunks.length > 0) {
          resolve(new Blob(this.recordedChunks, { type: mimeType }));
        } else {
          resolve(undefined);
        }
      }
    });
  }

  private static async finalizeAndSubmit(): Promise<void> {
    if (!this.isListeningActive) return;
    this.isListeningActive = false;

    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    if (this.volumeCheckRaf) cancelAnimationFrame(this.volumeCheckRaf);

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch (_) {}
      this.recognitionInstance = null;
    }

    const audioBlob = await this.flushAndGetAudioBlob();

    this.releaseMediaStream();

    const text = this.accumulatedTranscript.trim();
    const cb = this.onFinalResultCallback;
    this.onFinalResultCallback = null;

    if (cb) {
      cb(text, audioBlob);
    }
  }

  static async stopListening(submitIfText: boolean = true): Promise<{ text: string; audioBlob?: Blob }> {
    const wasActive = this.isListeningActive;
    this.isListeningActive = false;

    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    if (this.volumeCheckRaf) cancelAnimationFrame(this.volumeCheckRaf);

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch (_) {}
      this.recognitionInstance = null;
    }

    const audioBlob = await this.flushAndGetAudioBlob();
    this.releaseMediaStream();

    const text = this.accumulatedTranscript.trim();

    if (submitIfText && wasActive && this.onFinalResultCallback) {
      const cb = this.onFinalResultCallback;
      this.onFinalResultCallback = null;
      cb(text, audioBlob);
    }

    return { text, audioBlob };
  }

  private static releaseMediaStream(): void {
    if (this.activeMediaStream) {
      try {
        this.activeMediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (_) {}
      this.activeMediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  static isCurrentlyListening(): boolean {
    return this.isListeningActive;
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  static prewarmAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ttsAudioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ttsAudioContext = new AudioCtx();
        }
      }
      if (this.ttsAudioContext && this.ttsAudioContext.state === 'suspended') {
        this.ttsAudioContext.resume();
      }
    } catch (_) {}
  }

  static hasHindiVoice(): boolean {
    if (typeof window === 'undefined' || !this.isSynthesisSupported()) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.some(
      (v) =>
        v.lang === 'hi-IN' ||
        v.lang === 'hi' ||
        v.lang.startsWith('hi-') ||
        /hindi|हिन्दी/i.test(v.name)
    );
  }

  static speak(
    text: string,
    lang?: 'hi-IN' | 'en-IN',
    onStart?: () => void,
    onEnd?: () => void,
    rate?: number
  ): void {
    this.stopSpeaking();

    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const sessionId = this.activeSessionId;

    const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
    const targetLang: 'hi-IN' | 'en-IN' = isDevanagari ? 'hi-IN' : (lang || 'en-IN');

    if (targetLang === 'hi-IN') {
      this.playViaAudioEndpoint(cleanText, 'hi', onStart, onEnd, rate, sessionId);
      return;
    }

    if (this.isSynthesisSupported()) {
      this.speakWithWebSpeech(
        cleanText,
        'en-IN',
        onStart,
        onEnd,
        rate,
        () => {
          if (sessionId === this.activeSessionId) {
            this.playViaAudioEndpoint(cleanText, 'en', onStart, onEnd, rate, sessionId);
          }
        },
        sessionId
      );
    } else {
      this.playViaAudioEndpoint(cleanText, 'en', onStart, onEnd, rate, sessionId);
    }
  }

  private static speakWithWebSpeech(
    cleanText: string,
    targetLang: 'hi-IN' | 'en-IN',
    onStart?: () => void,
    onEnd?: () => void,
    rate?: number,
    onFallback?: () => void,
    sessionId: number = this.activeSessionId
  ): void {
    if (!this.isSynthesisSupported()) {
      if (sessionId === this.activeSessionId) {
        if (onFallback) onFallback();
        else if (onEnd) onEnd();
      }
      return;
    }

    if (sessionId !== this.activeSessionId) return;

    try {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = targetLang;
      utterance.rate = rate !== undefined ? rate : (targetLang === 'hi-IN' ? 0.95 : 1.0);
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (targetLang === 'hi-IN') {
        const matched = voices.find(
          (v) =>
            v.lang === 'hi-IN' ||
            v.lang === 'hi' ||
            v.lang.startsWith('hi-') ||
            /hindi|हिन्दी/i.test(v.name)
        );
        if (matched) utterance.voice = matched;
      } else {
        const matched =
          voices.find((v) => v.lang === 'en-IN' || (/india/i.test(v.name) && v.lang.startsWith('en'))) ||
          voices.find((v) => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang.startsWith('en'));
        if (matched) utterance.voice = matched;
      }

      this.currentUtterance = utterance;

      utterance.onstart = () => {
        if (sessionId !== this.activeSessionId) {
          try {
            window.speechSynthesis.cancel();
          } catch (_) {}
          return;
        }
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.isSpeaking = false;
          this.currentUtterance = null;
        }
        if (this.resumeInterval) {
          clearInterval(this.resumeInterval);
          this.resumeInterval = null;
        }
        if (sessionId === this.activeSessionId && onEnd) {
          onEnd();
        }
      };

      utterance.onerror = (e) => {
        if (this.currentUtterance === utterance) {
          this.isSpeaking = false;
          this.currentUtterance = null;
        }
        if (this.resumeInterval) {
          clearInterval(this.resumeInterval);
          this.resumeInterval = null;
        }

        if (
          e.error === 'interrupted' ||
          e.error === 'canceled' ||
          sessionId !== this.activeSessionId
        ) {
          return;
        }

        console.warn('[SpeechHandler] Web Speech utterance error:', e);
        if (sessionId === this.activeSessionId) {
          if (onFallback) {
            onFallback();
          } else if (onEnd) {
            onEnd();
          }
        }
      };

      if (this.resumeInterval) clearInterval(this.resumeInterval);
      this.resumeInterval = setInterval(() => {
        if (
          typeof window !== 'undefined' &&
          window.speechSynthesis?.speaking &&
          !window.speechSynthesis.paused
        ) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[SpeechHandler] Web Speech failed:', e);
      if (sessionId === this.activeSessionId) {
        if (onFallback) onFallback();
        else if (onEnd) onEnd();
      }
    }
  }

  private static async playViaAudioEndpoint(
    text: string,
    lang: 'hi' | 'en',
    onStart?: () => void,
    onEnd?: () => void,
    rate?: number,
    sessionId: number = this.activeSessionId
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    if (sessionId !== this.activeSessionId) return;

    this.isSpeaking = true;
    if (onStart) onStart();

    const abortController = new AbortController();
    this.currentAbortController = abortController;

    try {
      this.prewarmAudio();

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
        signal: abortController.signal,
      });

      if (sessionId !== this.activeSessionId) return;

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (sessionId !== this.activeSessionId) return;

        if (arrayBuf && arrayBuf.byteLength > 0) {
          if (!this.ttsAudioContext) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) this.ttsAudioContext = new AudioCtx();
          }

          if (this.ttsAudioContext) {
            if (this.ttsAudioContext.state === 'suspended') {
              await this.ttsAudioContext.resume();
            }
            if (sessionId !== this.activeSessionId) return;

            const audioBuffer = await this.ttsAudioContext.decodeAudioData(arrayBuf);
            if (sessionId !== this.activeSessionId) return;

            if (this.currentBufferSource) {
              try {
                this.currentBufferSource.onended = null;
                this.currentBufferSource.stop(0);
                this.currentBufferSource.disconnect();
              } catch (_) {}
              this.currentBufferSource = null;
            }

            const source = this.ttsAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            if (rate !== undefined && rate > 0) {
              source.playbackRate.value = rate;
            }
            source.connect(this.ttsAudioContext.destination);
            this.currentBufferSource = source;

            source.onended = () => {
              if (this.currentBufferSource === source) {
                this.currentBufferSource = null;
                this.isSpeaking = false;
              }
              if (sessionId === this.activeSessionId && onEnd) {
                onEnd();
              }
            };

            source.start(0);
            return;
          }
        }
      }
    } catch (webAudioErr: any) {
      if (webAudioErr?.name === 'AbortError' || sessionId !== this.activeSessionId) {
        return;
      }
      console.warn('[SpeechHandler] Web Audio playback error, trying HTMLAudioElement:', webAudioErr);
    }

    if (sessionId !== this.activeSessionId) return;

    try {
      const audioUrl = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(audioUrl);
      if (rate !== undefined) {
        audio.playbackRate = rate;
      }
      this.activeAudioElement = audio;

      audio.onended = () => {
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
          this.isSpeaking = false;
        }
        if (sessionId === this.activeSessionId && onEnd) {
          onEnd();
        }
      };

      audio.onerror = (err) => {
        if (sessionId !== this.activeSessionId) return;
        console.warn('[SpeechHandler] HTMLAudioElement error, falling back to Web Speech:', err);
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
          this.isSpeaking = false;
        }
        this.speakWithWebSpeech(text, lang === 'hi' ? 'hi-IN' : 'en-IN', onStart, onEnd, rate, undefined, sessionId);
      };

      await audio.play();
      if (sessionId !== this.activeSessionId) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      return;
    } catch (audioErr: any) {
      if (sessionId !== this.activeSessionId) return;
      console.warn('[SpeechHandler] HTMLAudioElement play() prevented, falling back to Web Speech:', audioErr);
      this.activeAudioElement = null;
      this.speakWithWebSpeech(text, lang === 'hi' ? 'hi-IN' : 'en-IN', onStart, onEnd, rate, undefined, sessionId);
    }
  }

  static stopSpeaking(): void {
    this.activeSessionId++;

    if (this.currentAbortController) {
      try {
        this.currentAbortController.abort();
      } catch (_) {}
      this.currentAbortController = null;
    }

    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.onended = null;
        this.currentBufferSource.stop(0);
        this.currentBufferSource.disconnect();
      } catch (_) {}
      this.currentBufferSource = null;
    }

    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.onended = null;
        this.activeAudioElement.onerror = null;
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
        this.activeAudioElement.src = '';
      } catch (_) {}
      this.activeAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (this.resumeInterval) {
        clearInterval(this.resumeInterval);
        this.resumeInterval = null;
      }
      if (this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
        this.currentUtterance.onstart = null;
        this.currentUtterance = null;
      }
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    this.isSpeaking = false;
  }
}
