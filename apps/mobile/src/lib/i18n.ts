import { messages } from '@clario/i18n';
import type { Messages, Namespace } from '@clario/i18n';

export function useTranslations<N extends Namespace>(namespace: N) {
  return function t(
    key: keyof Messages[N] & string,
    params?: Record<string, string | number>,
  ): string {
    const ns = messages[namespace] as Record<string, unknown>;

    // Flat lookup first; fall back to dot-notation traversal for nested keys
    let raw: unknown = ns[key];
    if (typeof raw !== 'string' && key.includes('.')) {
      raw = ns;
      for (const part of key.split('.')) {
        if (raw !== null && typeof raw === 'object') {
          raw = (raw as Record<string, unknown>)[part];
        } else {
          raw = undefined;
          break;
        }
      }
    }

    const value = typeof raw === 'string' ? raw : key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`,
    );
  };
}
