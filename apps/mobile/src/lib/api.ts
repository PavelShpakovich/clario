import { configure, setAuthTokenGetter } from '@clario/api-client';
import { supabase } from './supabase';

export function configureApiClient(): void {
  configure({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '' });
  setAuthTokenGetter(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  });
}
