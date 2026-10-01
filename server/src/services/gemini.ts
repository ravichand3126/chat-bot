import { GoogleGenerativeAI } from '@google/generative-ai';

export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key_here');
}

export async function generateTitle(firstUserMessage: string): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    return firstUserMessage.slice(0, 30) || 'New Conversation';
  }

  const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];

  for (const modelName of candidateModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const prompt = `Generate a short, clean 2 to 5 word title for a chat conversation based on this user message: "${firstUserMessage}". Do not use quotes or punctuation. Return ONLY the title text.`;
      const result = await model.generateContent(prompt);
      const title = result.response.text().trim();
      if (title) return title;
    } catch {
      continue;
    }
  }

  return firstUserMessage.slice(0, 30) || 'New Conversation';
}
