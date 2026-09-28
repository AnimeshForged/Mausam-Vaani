'use client';

import React, { useState, useEffect } from 'react';
import { GovernmentAlert, LocationInfo } from '@/types';

interface EarlyWarningSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: GovernmentAlert[];
  initialAlertId?: string | null;
  location: LocationInfo;
}

type BroadcastChannel = 'cell-broadcast' | 'sms' | 'ivr';

export default function EarlyWarningSimulatorModal({
  isOpen,
  onClose,
  alerts,
  initialAlertId,
  location,
}: EarlyWarningSimulatorModalProps) {
  // Filter red and orange alerts first, fallback to all
  const highPriorityAlerts = alerts.filter(a => a.severity === 'red' || a.severity === 'orange');
  const availableAlerts = highPriorityAlerts.length > 0 ? highPriorityAlerts : alerts;

  const [selectedAlertId, setSelectedAlertId] = useState<string>(
    initialAlertId || availableAlerts[0]?.id || ''
  );
  const [channel, setChannel] = useState<BroadcastChannel>('cell-broadcast');
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionProgress, setTransmissionProgress] = useState(0);
  const [transmissionComplete, setTransmissionComplete] = useState(false);
  const [selectedTehsils, setSelectedTehsils] = useState<string[]>([]);

  const currentAlert = availableAlerts.find(a => a.id === selectedAlertId) || availableAlerts[0];

  useEffect(() => {
    if (initialAlertId) {
      setSelectedAlertId(initialAlertId);
    } else if (availableAlerts[0]?.id) {
      setSelectedAlertId(availableAlerts[0].id);
    }
  }, [initialAlertId, availableAlerts]);

  useEffect(() => {
    if (currentAlert?.affectedTehsils) {
      setSelectedTehsils(currentAlert.affectedTehsils);
    }
    setTransmissionComplete(false);
    setTransmissionProgress(0);
  }, [currentAlert]);

  if (!isOpen || !currentAlert) return null;

  const playEmergencyTone = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(853, ctx.currentTime);
      osc.frequency.setValueAtTime(960, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio playback fails silently if browser policy blocks autoplay
    }
  };

  const handleStartBroadcast = () => {
    setIsTransmitting(true);
    setTransmissionProgress(10);
    setTransmissionComplete(false);
    playEmergencyTone();

    const t1 = setTimeout(() => setTransmissionProgress(45), 400);
    const t2 = setTimeout(() => {
      setTransmissionProgress(85);
      playEmergencyTone();
    }, 900);
    const t3 = setTimeout(() => {
      setTransmissionProgress(100);
      setIsTransmitting(false);
      setTransmissionComplete(true);
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const toggleTehsil = (tehsil: string) => {
    setSelectedTehsils(prev =>
      prev.includes(tehsil) ? prev.filter(t => t !== tehsil) : [...prev, tehsil]
    );
  };

  const totalEstimatedReach = (selectedTehsils.length * 36500) || 45000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="flex flex-col bg-surface-container-lowest w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-surface-container-low border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
              currentAlert.severity === 'red' 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-amber-500 text-white'
            }`}>
              <span className="material-symbols-outlined text-[1.4rem]">cell_tower</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-on-surface leading-tight">
                  Early Warning System (EWS) Broadcast Simulator
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  currentAlert.severity === 'red'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {currentAlert.severity === 'red' ? 'Extreme Red Alert' : 'Severe Orange Alert'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-medium">
                NDMA CAP 1.2 Protocol • Cell Broadcast (WEA) & Kisan SMS Dispatch Engine
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full border transition-all text-xs font-semibold flex items-center gap-1 ${
                soundEnabled 
                  ? 'border-primary/30 bg-primary/10 text-primary' 
                  : 'border-surface-container-high bg-surface-container text-outline'
              }`}
              title={soundEnabled ? 'Mute Tone' : 'Enable Alert Tone'}
            >
              <span className="material-symbols-outlined text-[1.1rem]">
                {soundEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[1.25rem]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body: Left Control Panel (5 cols) & Right Simulator View (7 cols) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Controls: Target Alert, Mode, Tehsils */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Alert Selector */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-high">
              <label className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1.5">
                Target Hazard Dossier
              </label>
              <select
                value={selectedAlertId}
                onChange={e => setSelectedAlertId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {availableAlerts.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.severity.toUpperCase()}] {a.titleEn} ({a.source})
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-2">
                <span>Source: <strong>{currentAlert.source}</strong></span>
                <span>Valid: <strong>{currentAlert.expiresInText}</strong></span>
              </div>
            </div>

            {/* Broadcast Channel Selector */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-high">
              <label className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1.5">
                Transmission Channel
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setChannel('cell-broadcast')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    channel === 'cell-broadcast'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1.25rem]">emergency</span>
                  <span className="text-[10px] mt-1">Cell Broadcast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    channel === 'sms'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1.25rem]">sms</span>
                  <span className="text-[10px] mt-1">Kisan SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('ivr')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    channel === 'ivr'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1.25rem]">ring_volume</span>
                  <span className="text-[10px] mt-1">Voice Blast</span>
                </button>
              </div>
            </div>

            {/* Target Tehsils & Geographic Polygon */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-high">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                  Target Tehsils / Cell Sectors
                </label>
                <span className="text-[10px] font-bold text-primary">
                  ~{totalEstimatedReach.toLocaleString()} farmers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {currentAlert.affectedTehsils.map(tehsil => {
                  const isChecked = selectedTehsils.includes(tehsil);
                  return (
                    <button
                      key={tehsil}
                      type="button"
                      onClick={() => toggleTehsil(tehsil)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked
                          ? 'bg-surface-container-lowest border-primary text-primary font-bold'
                          : 'bg-surface-container-high border-transparent text-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[0.95rem]">
                        {isChecked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span>{tehsil}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trigger Simulation Action */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-high flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStartBroadcast}
                disabled={isTransmitting || selectedTehsils.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-on-primary font-extrabold text-xs shadow-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[1.2rem] ${isTransmitting ? 'animate-spin' : ''}`}>
                  {isTransmitting ? 'sync' : 'cell_tower'}
                </span>
                <span>
                  {isTransmitting ? 'Broadcasting Payload...' : 'Simulate BTS Emergency Broadcast'}
                </span>
              </button>

              {/* Progress Bar */}
              {(isTransmitting || transmissionComplete) && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface">
                    <span>
                      {transmissionComplete
                        ? '✅ Dispatched to all BTS Sectors'
                        : `Dispatched: ${transmissionProgress}%`}
                    </span>
                    <span className="font-mono text-primary">{transmissionProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${transmissionProgress}%` }}
                    />
                  </div>
                  {transmissionComplete && (
                    <div className="text-[10px] text-green-700 font-bold flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      <span>Broadcast ACK received from {selectedTehsils.length} Tehsil Towers ({totalEstimatedReach.toLocaleString()} devices reached).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Preview Column: Mock Device Simulator */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900 rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
            {/* Background subtle radar grid */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Language preview toggle */}
            <div className="self-end mb-3 flex items-center gap-1 bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-slate-700 z-10">
              <span className="text-[10px] text-slate-400 font-bold px-2">Message Script:</span>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                  lang === 'hi' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                  lang === 'en' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* Simulated Phone Frame */}
            <div className="w-full max-w-sm bg-black rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-700 relative z-10">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                <div className="w-8 h-1.5 rounded-full bg-slate-900" />
              </div>

              {/* Screen Canvas */}
              <div className="bg-slate-950 rounded-[2rem] p-4 text-white min-h-[380px] flex flex-col justify-between border border-slate-800">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-3">
                  <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">network_cell</span>
                    <span className="material-symbols-outlined text-[13px]">wifi</span>
                    <span className="material-symbols-outlined text-[13px]">battery_full</span>
                  </div>
                </div>

                {/* Main Notification Card based on selected Channel */}
                {channel === 'cell-broadcast' && (
                  <div className={`p-4 rounded-2xl border-2 ${
                    currentAlert.severity === 'red'
                      ? 'bg-red-950/80 border-red-500 shadow-lg shadow-red-900/30'
                      : 'bg-amber-950/80 border-amber-500 shadow-lg shadow-amber-900/30'
                  } space-y-2.5 my-auto animate-fadeIn`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-[1.4rem] animate-bounce">
                        warning
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-300">
                        {lang === 'hi' ? 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA)' : 'EMERGENCY CELL BROADCAST • NDMA'}
                      </span>
                    </div>

                    <div className="font-extrabold text-sm text-white leading-snug">
                      {lang === 'hi' ? currentAlert.titleHi : currentAlert.titleEn}
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed font-medium">
                      {lang === 'hi' ? currentAlert.hindiSummary : currentAlert.englishSummary}
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                      <span>प्रभावित क्षेत्र: {selectedTehsils.slice(0, 3).join(', ')}</span>
                      <span>CAP 1.2</span>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 mt-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      {lang === 'hi' ? 'निर्देश देखें (सुरक्षित स्थान पर जाएं)' : 'OK / View Safety Directives'}
                    </button>
                  </div>
                )}

                {channel === 'sms' && (
                  <div className="my-auto space-y-3 animate-fadeIn">
                    <div className="text-center text-[10px] text-slate-400">
                      SMS • Today {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-3.5 border border-slate-700 text-xs space-y-1.5 shadow-md">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                        <span>VK-NDMAGV (mKisan)</span>
                        <span>Official</span>
                      </div>
                      <p className="text-white text-xs leading-relaxed">
                        {lang === 'hi' 
                          ? `[चेतावनी: NDMA] ${currentAlert.titleHi}। ${currentAlert.hindiSummary} तत्काल सुरक्षित स्थान पर जाएं। -मौसम-वाणी`
                          : `[ALERT: NDMA] ${currentAlert.titleEn}. ${currentAlert.englishSummary} Move to safe shelter immediately. -MausamVaani`}
                      </p>
                      <div className="text-[9px] text-slate-400 text-right">
                        DLT: 14071589230 • 158 Chars
                      </div>
                    </div>
                  </div>
                )}

                {channel === 'ivr' && (
                  <div className="my-auto flex flex-col items-center text-center space-y-3 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined text-[2rem]">call</span>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white">NDMA KRISHI DISPATCH</div>
                      <div className="text-xs text-emerald-400 font-mono">1078 (Connected 00:12)</div>
                    </div>
                    <div className="bg-slate-800/90 p-3 rounded-xl text-left border border-slate-700 text-[11px] text-slate-200">
                      <div className="text-[10px] text-slate-400 mb-1">Simulated Dialect Speech Audio:</div>
                      &quot;{lang === 'hi' ? currentAlert.audioScriptHi : currentAlert.audioScriptEn}&quot;
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Bar */}
                <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-4" />
              </div>
            </div>

            {/* Bottom Caption */}
            <div className="text-[11px] text-slate-400 text-center mt-3">
              Sector: <strong>{location.name}</strong> • Frequency Band: <strong>3.5 GHz (n78 5G) & 850 MHz (GSM CBS)</strong>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-surface-container-low border-t border-surface-container-high flex flex-wrap items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>State Emergency Operation Centre (SEOC) Gateway Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-surface-container-highest text-on-surface text-xs font-bold hover:bg-surface-container transition-all"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
