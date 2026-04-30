import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { calculateNatalChart } from '@/lib/astrology/engine';

export const GET = withApiHandler(async () => {
  await requireAuth();

  const today = new Date();
  try {
    const skyResult = await calculateNatalChart({
      personName: 'sky',
      birthDate: today.toISOString().slice(0, 10),
      birthTime: '12:00',
      birthTimeKnown: true,
      city: 'London',
      country: 'GB',
      latitude: 51.5,
      longitude: 0,
      houseSystem: 'equal',
      label: 'sky',
      subjectType: 'other',
    });
    const byKey = Object.fromEntries(skyResult.positions.map((p) => [p.bodyKey, p.signKey]));
    return NextResponse.json({
      sun: byKey.sun ?? null,
      moon: byKey.moon ?? null,
      mercury: byKey.mercury ?? null,
    });
  } catch {
    return NextResponse.json({ sun: null, moon: null, mercury: null });
  }
});
