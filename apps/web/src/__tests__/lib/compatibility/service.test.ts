jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { COMPATIBILITY_TYPES, createPendingCompatibility } from '@/lib/compatibility/service';
import { ValidationError } from '@/lib/errors';

const mockFrom = supabaseAdmin.from as jest.Mock;

type CompatibilityType = (typeof COMPATIBILITY_TYPES)[number];

function makeSelectQuery(data: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
  };
}

function setupCreatePendingCompatibilityDb(options?: {
  primarySnapshot?: { id: string } | null;
  secondarySnapshot?: { id: string } | null;
}) {
  let chartCall = 0;
  let snapshotCall = 0;
  let insertedPayload: Record<string, unknown> | null = null;

  mockFrom.mockImplementation((table: string) => {
    if (table === 'charts') {
      chartCall += 1;
      return makeSelectQuery({ id: chartCall === 1 ? 'chart-primary' : 'chart-secondary' });
    }

    if (table === 'chart_snapshots') {
      snapshotCall += 1;
      const data =
        snapshotCall === 1
          ? options && 'primarySnapshot' in options
            ? options.primarySnapshot
            : { id: 'snapshot-primary' }
          : options && 'secondarySnapshot' in options
            ? options.secondarySnapshot
            : { id: 'snapshot-secondary' };

      return makeSelectQuery(data);
    }

    if (table === 'compatibility_reports') {
      return {
        insert: jest.fn((payload: Record<string, unknown>) => {
          insertedPayload = payload;

          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'report-1', ...payload },
                error: null,
              }),
            }),
          };
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    getInsertedPayload: () => insertedPayload,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createPendingCompatibility', () => {
  it.each([
    ['romantic', 'compatibility-romantic-v1'],
    ['friendship', 'compatibility-friendship-v1'],
    ['business', 'compatibility-business-v1'],
    ['family', 'compatibility-family-v1'],
  ] as Array<[CompatibilityType, string]>)(
    'stores prompt version and type for %s reports',
    async (compatibilityType, promptVersion) => {
      const db = setupCreatePendingCompatibilityDb();

      const report = await createPendingCompatibility(
        'user-1',
        'chart-primary',
        'chart-secondary',
        compatibilityType,
      );

      expect(report).toEqual(
        expect.objectContaining({
          id: 'report-1',
          compatibility_type: compatibilityType,
          prompt_version: promptVersion,
          status: 'pending',
        }),
      );
      expect(db.getInsertedPayload()).toEqual(
        expect.objectContaining({
          user_id: 'user-1',
          primary_chart_id: 'chart-primary',
          secondary_chart_id: 'chart-secondary',
          compatibility_type: compatibilityType,
          prompt_version: promptVersion,
          status: 'pending',
        }),
      );
    },
  );

  it('rejects creation when one of the charts has no snapshot yet', async () => {
    setupCreatePendingCompatibilityDb({ secondarySnapshot: null });

    await expect(
      createPendingCompatibility('user-1', 'chart-primary', 'chart-secondary', 'family'),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Both charts must have generated snapshots before compatibility can be created',
      }),
    );

    expect(mockFrom).not.toHaveBeenCalledWith('compatibility_reports');
  });

  it('throws ValidationError for missing snapshots', async () => {
    setupCreatePendingCompatibilityDb({ primarySnapshot: null });

    try {
      await createPendingCompatibility('user-1', 'chart-primary', 'chart-secondary', 'romantic');
      throw new Error('Expected createPendingCompatibility to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
    }
  });
});
