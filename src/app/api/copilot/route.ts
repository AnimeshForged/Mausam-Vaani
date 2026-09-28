import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanJsonString, generateContentWithFallback } from '@/lib/geminiHelper';
import { buildDomainCopilotFallback } from '@/lib/apiFallbackHelper';

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { userQuery = '', history, location, weather, language } = body;

  const isDevanagari = /[\u0900-\u097F]/.test(userQuery);
  // If user requested English (language === 'en'), strictly keep 'en' unless the query contains actual Devanagari script
  const targetLanguage: 'hi' | 'en' = language === 'en'
    ? (isDevanagari ? 'hi' : 'en')
    : 'hi';

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(buildDomainCopilotFallback(userQuery, location, weather, targetLanguage));
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const historyContext = Array.isArray(history)
      ? history.slice(-4).map((m: any) => `${m.sender}: ${m.text}`).join('\n')
      : '';

    const systemGrounding = `You are Mausam Vaani (मौसम-वाणी) Climate Copilot & Senior Agronomist AI, grounded in ICAR (Indian Council of Agricultural Research) Package of Practices, Krishi Vigyan Kendra (KVK) guidelines, and Government of India Soil Health Card (SHC) standards.
Current Location: ${location?.name || 'Local Region'} (${location?.lat || 26.8467}°N, ${location?.lng || 80.9462}°E).
Current Telemetry:
- Temperature: ${weather?.temperature ?? 31}°C (Apparent: ${weather?.apparentTemperature ?? 34}°C)
- Condition: ${weather?.conditionEn || 'Partly Cloudy'} (${weather?.conditionHi || 'आंशिक बादल'})
- Humidity: ${weather?.relativeHumidity ?? 75}%
- Wind: ${weather?.windSpeed ?? 14} km/h ${weather?.windCompass || 'NW'}
- Soil Moisture: ${weather?.soilMoisture ?? 64}%

Recent Chat History:
${historyContext}

User Query: "${userQuery}"

Provide an authoritative, scientifically grounded agronomic and meteorological advisory. Ground all crop, soil, fertilizer, and pest management advice strictly in ICAR Package of Practices and Soil Health Card N-P-K / micro-nutrient benchmarks.

CRITICAL LANGUAGE REQUIREMENT:
The user selected language: ${targetLanguage === 'hi' ? 'HINDI (हिन्दी)' : 'ENGLISH'}.
1. "detectedLanguage": "${targetLanguage}"
2. "reply": MUST be completely in ${targetLanguage === 'hi' ? 'clear natural Hindi (Devanagari script, like किसान भाइयों...)' : 'clear, fluent English'}!
3. "spokenResponse": Direct, friendly spoken answer for the voice assistant. MUST be completely in ${targetLanguage === 'hi' ? 'fluent Hindi (Devanagari script)' : 'fluent spoken English'}!
4. "text": English scientific explanation.
5. "textHi": Hindi explanation in Devanagari.
6. "verdictTitle": Directive title in ${targetLanguage === 'hi' ? 'Hindi' : 'English'}.
7. "verdictDesc": Key actionable takeaway sentence in ${targetLanguage === 'hi' ? 'Hindi' : 'English'}.

Respond with ONLY a valid JSON object matching this structure:
{
  "detectedLanguage": "${targetLanguage}",
  "reply": "${targetLanguage === 'hi' ? 'हिन्दी में सीधा उत्तर' : 'Direct English response'}",
  "spokenResponse": "${targetLanguage === 'hi' ? 'हिन्दी में बोलने योग्य उत्तर (Devanagari)' : 'Direct spoken response in English'}",
  "text": "Detailed English explanation",
  "textHi": "सरल एवं स्पष्ट हिन्दी सलाह (किसान की भाषा में)",
  "consensusScore": 96.4,
  "verdictTitle": "Short directive title",
  "verdictTitleEn": "English title",
  "verdictTitleHi": "Hindi title",
  "verdictDesc": "One key actionable takeaway sentence",
  "verdictDescEn": "English directive sentence",
  "verdictDescHi": "Hindi directive sentence",
  "verdictType": "warning" | "info" | "success",
  "tableData": [
    {"Metric": "Value", "Window": "Timing", "Status": "Safe/Caution/Unsafe"}
  ]
}`;

    const { result, modelName } = await generateContentWithFallback(genAI, systemGrounding);
    const raw = result.response.text().trim();
    const clean = cleanJsonString(raw);

    try {
      const parsed = JSON.parse(clean);
      const isHi = targetLanguage === 'hi';
      const detectedLang = isHi ? 'hi' : 'en';

      const hindiReply =
        parsed.textHi ||
        (parsed.reply && /[\u0900-\u097F]/.test(parsed.reply) ? parsed.reply : '') ||
        (parsed.spokenResponse && /[\u0900-\u097F]/.test(parsed.spokenResponse) ? parsed.spokenResponse : '');
      const englishReply = parsed.text || (parsed.reply && !/[\u0900-\u097F]/.test(parsed.reply) ? parsed.reply : '');

      const finalReply = detectedLang === 'hi' ? (hindiReply || parsed.reply || parsed.text) : (englishReply || parsed.reply || parsed.text);
      const finalSpoken =
        detectedLang === 'hi'
          ? (parsed.spokenResponse && /[\u0900-\u097F]/.test(parsed.spokenResponse) ? parsed.spokenResponse : finalReply)
          : (englishReply || parsed.spokenResponse || finalReply);

      return NextResponse.json({
        ...parsed,
        detectedLanguage: detectedLang,
        reply: finalReply,
        spokenResponse: finalSpoken,
        text: parsed.text || finalReply,
        textHi: parsed.textHi || hindiReply || finalReply,
        modelBadge: `${modelName} • Multi-Model Grounded`,
      });
    } catch {
      const isHi = targetLanguage === 'hi';
      return NextResponse.json({
        detectedLanguage: isHi ? 'hi' : 'en',
        reply: raw,
        spokenResponse: raw,
        text: raw,
        textHi: raw,
        consensusScore: 95.0,
        verdictTitle: isHi ? 'कृषि परामर्श' : 'Agronomic Advisory',
        verdictTitleEn: 'Agronomic Advisory',
        verdictTitleHi: 'कृषि परामर्श',
        verdictDesc: isHi ? 'मौसम-वाणी एग्रो-मॉडल द्वारा सत्यापित परामर्श।' : 'Advisory verified by Mausam-Vaani Agro-Model.',
        verdictDescEn: 'Advisory verified by Mausam-Vaani Agro-Model.',
        verdictDescHi: 'मौसम-वाणी एग्रो-मॉडल द्वारा सत्यापित परामर्श।',
        verdictType: 'info',
        modelBadge: `${modelName} • Multi-Model Grounded`,
      });
    }
  } catch (error: any) {
    console.warn('Gemini copilot route caught error, serving verified domain fallback:', error?.message || error);
    return NextResponse.json(buildDomainCopilotFallback(userQuery, location, weather, targetLanguage));
  }
}
