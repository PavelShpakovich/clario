jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from '@/lib/auth/email-verification';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';

const mockFrom = supabaseAdmin.from as jest.Mock;

describe('auth helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('consumeEmailVerificationToken', () => {
    it('consumes a token with a single conditional update and returns the payload', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { user_id: 'user-1', email: 'user@example.com' },
        error: null,
      });
      const select = jest.fn().mockReturnValue({ maybeSingle });
      const gt = jest.fn().mockReturnValue({ select });
      const is = jest.fn().mockReturnValue({ gt });
      const eq = jest.fn().mockReturnValue({ is });
      const update = jest.fn().mockReturnValue({ eq });

      mockFrom.mockReturnValue({ update });

      const result = await consumeEmailVerificationToken('token-123');

      expect(mockFrom).toHaveBeenCalledWith('email_verification_tokens');
      expect(update).toHaveBeenCalledWith({ consumed_at: expect.any(String) });
      expect(eq).toHaveBeenCalledWith('token_hash', expect.any(String));
      expect(is).toHaveBeenCalledWith('consumed_at', null);
      expect(gt).toHaveBeenCalledWith('expires_at', expect.any(String));
      expect(select).toHaveBeenCalledWith('user_id, email');
      expect(result).toEqual({ userId: 'user-1', email: 'user@example.com' });
    });

    it('returns null when no unconsumed token row matches', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const select = jest.fn().mockReturnValue({ maybeSingle });
      const gt = jest.fn().mockReturnValue({ select });
      const is = jest.fn().mockReturnValue({ gt });
      const eq = jest.fn().mockReturnValue({ is });
      const update = jest.fn().mockReturnValue({ eq });

      mockFrom.mockReturnValue({ update });

      await expect(consumeEmailVerificationToken('token-123')).resolves.toBeNull();
    });
  });

  describe('ensureSupabaseIdentityLink', () => {
    it('upserts the supabase identity and verifies the linked user id', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { user_id: 'user-1' },
        error: null,
      });
      const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
      const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
      const select = jest.fn().mockReturnValue({ eq: eqFirst });
      const upsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockReturnValueOnce({ upsert }).mockReturnValueOnce({ select });

      await expect(
        ensureSupabaseIdentityLink('user-1', 'user@example.com'),
      ).resolves.toBeUndefined();

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          provider: 'supabase',
          provider_user_id: 'user-1',
          provider_email: 'user@example.com',
        }),
        { onConflict: 'provider,provider_user_id' },
      );
      expect(select).toHaveBeenCalledWith('user_id');
    });

    it('throws when the stored identity points to another user', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { user_id: 'user-2' },
        error: null,
      });
      const eqSecond = jest.fn().mockReturnValue({ maybeSingle });
      const eqFirst = jest.fn().mockReturnValue({ eq: eqSecond });
      const select = jest.fn().mockReturnValue({ eq: eqFirst });
      const upsert = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockReturnValueOnce({ upsert }).mockReturnValueOnce({ select });

      await expect(ensureSupabaseIdentityLink('user-1', 'user@example.com')).rejects.toThrow(
        'Supabase identity is already linked to another account',
      );
    });
  });
});
