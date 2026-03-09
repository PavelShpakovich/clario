/**
 * Feature flags — code-based toggles for enabling/disabling features.
 *
 * To re-enable web auth:
 *   Set WEB_AUTH_ENABLED to true and redeploy.
 */
export const FLAGS = {
  /**
   * When false:
   *  - /login, /register, /auth/forgot-password redirect to the Telegram bot
   *  - POST /api/auth/register returns 410
   *  - Landing page CTAs link to the bot instead of /register and /login
   *
   * When true: full web login and registration are available.
   */
  WEB_AUTH_ENABLED: false,
} as const;
