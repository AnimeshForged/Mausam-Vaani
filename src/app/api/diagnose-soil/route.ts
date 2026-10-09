import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanJsonString, generateContentWithFallback } from '@/lib/geminiHelper';
import { DEFAULT_SOIL_RESPONSE } from '@/lib/apiFallbackHelper';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { imageBase64 } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !imageBase64) {
      return NextResponse.json(DEFAULT_SOIL_RESPONSE);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const locName = body.location?.name ? `${body.location.name}, ${body.location.state || 'India'}` : 'India';
    const prompt = `You are a certified ICAR / Soil Health Card soil scientist and agronomist in India (Current Region: ${locName}).
Analyze this soil photograph:
1. Soil type classification (e.g. Deep Black Cotton / Vertisol, Alluvial Soil, Medium Loamy, Red / Laterite, Sandy Loam)
2. Granular aggregate texture & aeration
3. Visual surface moisture percentage estimate
4. Estimated pH range and organic carbon levels
5. Primary recommended crops for this soil and region

Return ONLY valid JSON matching this format:
{
  "identifiedType": "Deep Black Cotton Soil (Regur Vertisol)",
  "identifiedTypeHi": "काली कपासिया मिट्टी (रेगुर)",
  "textureDescription": "Crumbly clay aggregate with visible organic darkening and optimal moisture pore spaces",
  "textureDescriptionHi": "भुरभुरी चिकनी मिट्टी जिसमें जैविक कार्बन व पर्याप्त नमी के लक्षण हैं",
  "moistureEstimate": "65% - 70% (Adequate for sowing)",
  "organicEstimate": "High Organic Matter (>0.75% Organic Carbon)",
  "phEstimate": 7.4,
  "recommendationNote": "Ideal for Soybean (JS 20-34), Bt Cotton, and Hybrid Maize"
}`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const { result } = await generateContentWithFallback(genAI, [
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const raw = result.response.text().trim();
    const clean = cleanJsonString(raw);
    const parsed = JSON.parse(clean);

    return NextResponse.json({ ...parsed, isApproximate: true });
  } catch (error: any) {
    console.warn('Soil diagnosis API fallback triggered:', error?.message || error);
    return NextResponse.json(DEFAULT_SOIL_RESPONSE);
  }
}
