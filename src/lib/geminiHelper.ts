import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

export const CANDIDATE_GEMINI_MODELS: string[] = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL || '',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean)
  )
);

export async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  contents: Parameters<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>[0]
): Promise<{ result: GenerateContentResult; modelName: string }> {
  let lastError: any = null;

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contents);
      return { result, modelName };
    } catch (err: any) {
      console.warn(`[GeminiHelper] Model '${modelName}' attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed.');
}

export function cleanJsonString(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}
