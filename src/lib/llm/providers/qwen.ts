import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput, extractArrayFromObject } from '@/lib/llm/parse';
import { logger } from '@/lib/logger';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

/**
 * QWEN LLM Provider
 * Uses Alibaba Cloud's QWEN via OpenAI-compatible API
 * API Docs: https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
 *
 * Endpoint varies by region:
 * - Singapore: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 * - US (Virginia): https://dashscope-us.aliyuncs.com/compatible-mode/v1
 * - China (Beijing): https://dashscope.aliyuncs.com/compatible-mode/v1
 */
export class QwenProvider implements LlmProviderAdapter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    if (!env.QWEN_API_KEY) {
      throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
    }
    this.apiKey = env.QWEN_API_KEY;
    this.model = env.QWEN_MODEL;
    // Default to Beijing region; support QWEN_BASE_URL override for other regions
    this.baseUrl = env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);

    logger.info(
      { model: this.model, baseUrl: this.baseUrl, count: input.count },
      'QWEN: Starting request',
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2-minute timeout

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.7,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error(
          { status: res.status, statusText: res.statusText, errorText },
          'QWEN: Request failed',
        );
        throw new LlmError({
          message: `QWEN request failed: ${res.status} ${res.statusText}`,
          context: { status: res.status, body: errorText.slice(0, 200) },
        });
      }

      interface OpenAIResponse {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      }

      const data = (await res.json()) as OpenAIResponse;
      logger.info({ contentLength: data.choices[0]?.message.content.length }, 'QWEN: Got response');

      const raw = data.choices[0]?.message.content ?? '';
      if (!raw) {
        throw new LlmError({ message: 'QWEN returned empty response' });
      }

      // Handle both direct array and object wrapper
      const text = raw.trim().startsWith('[') ? raw : extractArrayFromObject(raw);
      logger.info({ textLength: text.length }, 'QWEN: Parsing output');

      const result = parseLlmOutput(text);
      logger.info({ cardCount: result.length }, 'QWEN: Parsed successfully');
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LlmError({
          message: 'QWEN request timeout (2 minutes)',
          context: { timeout: 120_000 },
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
