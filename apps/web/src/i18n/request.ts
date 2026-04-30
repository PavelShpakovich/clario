import { getRequestConfig } from 'next-intl/server';
import { messages } from '@clario/i18n';

export default getRequestConfig(async () => {
  const locale = 'ru';
  return {
    locale,
    messages,
  };
});
