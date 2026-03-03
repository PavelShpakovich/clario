import { NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// We use a singleton-like pattern for the bot since we're in a serverless environment (Next.js)
// but webhooks are transient.
const token = env.TELEGRAM_BOT_TOKEN;
const appUrl = env.NEXT_PUBLIC_APP_URL;

export async function POST(req: Request) {
  if (!token) {
    return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    logger.info({ update_id: body.update_id }, 'Telegram webhook received');

    // Initialize bot in webhook mode (not polling)
    const bot = new TelegramBot(token);

    // Handle messages
    if (body.message) {
      const { chat, text } = body.message;

      if (text === '/start') {
        const entryUrl = `${appUrl}/tg`;
        await bot.sendMessage(
          chat.id,
          'Welcome to Microlearning! 🚀\n\nTransform long content into bite-sized flashcards and study them right here in Telegram.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🚀 Launch App',
                    web_app: { url: entryUrl },
                  },
                ],
              ],
            },
          },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, 'Error in Telegram webhook');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
