import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const resend = new Resend(env.RESEND_API_KEY);

// ── Templates ────────────────────────────────────────────────────────────────

const templates: Record<'en' | 'ru', (link: string) => { subject: string; html: string }> = {
  en: (link) => ({
    subject: 'Verify your Clario email',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#09090b;padding:24px 40px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Clario</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.3px;">Verify your email</p>
            <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
              Click the button below to verify your email address and activate your Clario account.
              This link expires in 24 hours.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#09090b;">
                  <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Verify email →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;">
              Or copy this link:<br/>
              <a href="${link}" style="color:#09090b;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.<br/>
              © 2026 Clario. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }),

  ru: (link) => ({
    subject: 'Подтвердите email для Clario',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#09090b;padding:24px 40px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Clario</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.3px;">Подтвердите ваш email</p>
            <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
              Нажмите кнопку ниже, чтобы подтвердить ваш email и активировать аккаунт Clario.
              Ссылка действительна 24 часа.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#09090b;">
                  <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Подтвердить email →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;">
              Или скопируйте ссылку:<br/>
              <a href="${link}" style="color:#09090b;word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
              Если вы не запрашивали это письмо, просто проигнорируйте его.<br/>
              © 2026 Clario. Все права защищены.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }),
};

// ── Sender ───────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  link: string,
  locale: 'en' | 'ru' = 'en',
): Promise<void> {
  const template = templates[locale] ?? templates.en;
  const { subject, html } = template(link);

  const fromEmail = env.RESEND_FROM_EMAIL ?? 'noreply@clario.app';

  const { error } = await resend.emails.send({
    from: `Clario <${fromEmail}>`,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error({ error, to, locale }, 'Failed to send verification email via Resend');
    throw new Error(`Email send failed: ${error.message}`);
  }

  logger.info({ to, locale }, 'Verification email sent via Resend');
}
