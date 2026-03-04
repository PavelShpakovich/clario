import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput } from '@/lib/llm/parse';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

export class GeminiProvider implements LlmProviderAdapter {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new LlmError({ message: 'GEMINI_API_KEY is required when LLM_PROVIDER=gemini' });
    }
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = env.GEMINI_MODEL;
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: system,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const response = await result.response;
    const text = response.text();

    return parseLlmOutput(text);
  }
}
