import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { getCreditPacks, getAllCreditPacks } from '@/lib/credits/pricing';

export const GET = withApiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const includeInactive = url.searchParams.get('includeInactive') === 'true';

  if (includeInactive) {
    const { requireAdmin } = await import('@/lib/api/auth');
    await requireAdmin();
    const packs = await getAllCreditPacks();
    return NextResponse.json({ packs });
  }

  const packs = await getCreditPacks();
  return NextResponse.json({ packs });
});
