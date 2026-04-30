import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { calculateNatalChart } from '@/lib/astrology/engine';

type MoonPhase =
  | 'new'
  | 'crescent'
  | 'first-quarter'
  | 'gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

function getMoonPhase(sunDeg: number, moonDeg: number): MoonPhase {
  const angle = ((moonDeg - sunDeg) + 360) % 360;
  if (angle < 22.5 || angle >= 337.5) return 'new';
  if (angle < 67.5) return 'crescent';
  if (angle < 112.5) return 'first-quarter';
  if (angle < 157.5) return 'gibbous';
  if (angle < 202.5) return 'full';
  if (angle < 247.5) return 'waning-gibbous';
  if (angle < 292.5) return 'last-quarter';
  return 'waning-crescent';
}

export const GET = withApiHandler(async () => {
  const today = new Date();
  const days = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const result = await calculateNatalChart({
      birthDate: dateStr,
      birthTime: '12:00',
      birthTimeKnown: true,
      latitude: 51.5,
      longitude: 0.0,
      timezone: 'UTC',
      houseSystem: 'placidus',
      // Required by BirthDataInput but unused in ephemeris computation
      personName: 'calendar',
      label: 'calendar',
      subjectType: 'self',
      city: 'London',
      country: 'GB',
    });

    const sunPos = result.positions.find((p) => p.bodyKey === 'sun');
    const moonPos = result.positions.find((p) => p.bodyKey === 'moon');

    days.push({
      date: dateStr,
      sunSign: sunPos?.signKey ?? null,
      moonSign: moonPos?.signKey ?? null,
      sunDeg: sunPos?.degreeDecimal ?? null,
      moonDeg: moonPos?.degreeDecimal ?? null,
      phase:
        sunPos && moonPos
          ? getMoonPhase(sunPos.degreeDecimal, moonPos.degreeDecimal)
          : null,
    });
  }

  return NextResponse.json({ days });
});
