import OpenAI from 'openai';
import type { ZodType } from 'zod';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { parseStructuredJson } from '@/lib/llm/structured-output';

interface StructuredGenerationRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  mockResponse: T;
}

export async function generateStructuredOutput<T>(
  request: StructuredGenerationRequest<T>,
): Promise<T> {
  if (env.LLM_PROVIDER === 'mock') {
    return request.mockResponse;
  }

  const raw = await generateStructuredText(request.systemPrompt, request.userPrompt);
  return parseStructuredJson(raw, request.schema);
}

async function generateStructuredText(systemPrompt: string, userPrompt: string): Promise<string> {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return generateWithQwen(systemPrompt, userPrompt);
    default:
      throw new LlmError({
        message: `Unsupported LLM_PROVIDER: ${String(env.LLM_PROVIDER)}`,
      });
  }
}

async function generateWithQwen(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.QWEN_API_KEY) {
    throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.QWEN_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    // @ts-expect-error QWEN-specific flag not in SDK types yet.
    enable_thinking: false,
  });

  return response.choices[0]?.message.content ?? '';
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Multi-turn chat completion. Used for follow-up questions on a reading.
 * Returns plain text (no structured JSON parsing).
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  if (env.LLM_PROVIDER === 'mock') {
    return 'Это тестовый ответ ассистента. В рабочем режиме здесь был бы развёрнутый ответ на ваш вопрос по разбору.';
  }

  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return generateChatWithQwen(messages);
    default:
      throw new LlmError({
        message: `Unsupported LLM_PROVIDER: ${String(env.LLM_PROVIDER)}`,
      });
  }
}

async function generateChatWithQwen(messages: ChatMessage[]): Promise<string> {
  if (!env.QWEN_API_KEY) {
    throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.QWEN_MODEL,
    messages,
    temperature: 0.7,
    // @ts-expect-error QWEN-specific flag not in SDK types yet.
    enable_thinking: false,
  });

  return response.choices[0]?.message.content ?? '';
}

/**
 * Streaming multi-turn chat. Returns a ReadableStream of text chunks.
 * The full accumulated text is also passed to `onComplete` when the stream ends.
 */
export function streamChatResponse(
  messages: ChatMessage[],
  onComplete: (fullText: string) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  if (env.LLM_PROVIDER === 'mock') {
    const text =
      'Это тестовый ответ ассистента. В рабочем режиме здесь был бы развёрнутый ответ на ваш вопрос по разбору.';
    return new ReadableStream({
      start(controller) {
        const words = text.split(' ');
        let i = 0;
        const tick = () => {
          if (i >= words.length) {
            controller.close();
            void onComplete(text);
            return;
          }
          controller.enqueue(encoder.encode((i > 0 ? ' ' : '') + words[i]));
          i++;
          setTimeout(tick, 30);
        };
        tick();
      },
    });
  }

  if (!env.QWEN_API_KEY) {
    return new ReadableStream({
      start(controller) {
        controller.error(new LlmError({ message: 'QWEN_API_KEY is required' }));
      },
    });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  let fullContent = '';

  return new ReadableStream({
    async start(controller) {
      try {
        // @ts-expect-error Qwen platform extends OpenAI streaming API with vendor-specific params.
        const stream = await client.chat.completions.create({
          model: env.QWEN_MODEL,
          messages,
          temperature: 0.7,
          stream: true,
          enable_thinking: false,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content ?? '';
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        controller.close();
        await onComplete(fullContent);
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
