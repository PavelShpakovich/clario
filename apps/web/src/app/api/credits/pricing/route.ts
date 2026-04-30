import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { getCreditCosts, getFreeProducts } from '@/lib/credits/pricing';

export const GET = withApiHandler(async () => {
  const [costs, freeProducts] = await Promise.all([getCreditCosts(), getFreeProducts()]);
  return NextResponse.json({ costs, freeProducts: [...freeProducts] });
});
