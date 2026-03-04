/**
 * Derives a human-readable display name from an email address by taking the
 * local part (before @) and falling back to 'User' if unavailable.
 *
 * @example
 * deriveDisplayNameFromEmail('john.doe@example.com') // 'john.doe'
 */
export function deriveDisplayNameFromEmail(email: string | null | undefined): string {
  return email?.split('@')[0] || 'User';
}
