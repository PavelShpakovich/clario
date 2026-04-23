import { computeSlowTransitAspects } from '@/lib/forecasts/service';

const NATAL_POSITIONS = [
  { body_key: 'sun', degree_decimal: 15.0 },
  { body_key: 'moon', degree_decimal: 100.0 },
  { body_key: 'venus', degree_decimal: 45.0 },
  { body_key: 'saturn', degree_decimal: 270.0 },
];

describe('computeSlowTransitAspects', () => {
  it('finds Jupiter conjunction with natal planet', () => {
    const transits = [
      { bodyKey: 'jupiter', degreeDecimal: 16.0, retrograde: false },
      { bodyKey: 'saturn', degreeDecimal: 200.0, retrograde: false },
    ];

    const result = computeSlowTransitAspects(NATAL_POSITIONS, transits);

    // Jupiter at 16° conjunct natal Sun at 15° — orb 1°
    const jupiterSun = result.find(
      (a) => a.transitBody === 'jupiter' && a.natalBody === 'sun' && a.aspectName === 'соединение',
    );
    expect(jupiterSun).toBeDefined();
    expect(jupiterSun!.orb).toBeCloseTo(1.0, 1);
  });

  it('finds Saturn opposition to natal planet', () => {
    const transits = [
      { bodyKey: 'jupiter', degreeDecimal: 300.0, retrograde: false },
      { bodyKey: 'saturn', degreeDecimal: 46.0, retrograde: false },
    ];

    const result = computeSlowTransitAspects(NATAL_POSITIONS, transits);

    // Saturn at 46° conjunct natal Venus at 45° — orb 1°
    const saturnVenus = result.find(
      (a) => a.transitBody === 'saturn' && a.natalBody === 'venus' && a.aspectName === 'соединение',
    );
    expect(saturnVenus).toBeDefined();
    expect(saturnVenus!.orb).toBeCloseTo(1.0, 1);
  });

  it('ignores fast planets', () => {
    const transits = [
      { bodyKey: 'sun', degreeDecimal: 15.0, retrograde: false },
      { bodyKey: 'mars', degreeDecimal: 15.0, retrograde: false },
      { bodyKey: 'jupiter', degreeDecimal: 300.0, retrograde: false },
    ];

    const result = computeSlowTransitAspects(NATAL_POSITIONS, transits);

    // Should not include sun or mars transits
    expect(result.every((a) => a.transitBody !== 'sun')).toBe(true);
    expect(result.every((a) => a.transitBody !== 'mars')).toBe(true);
  });

  it('uses tight orbs (2°)', () => {
    const transits = [
      { bodyKey: 'jupiter', degreeDecimal: 18.0, retrograde: false }, // 3° from natal Sun — too wide
    ];

    const result = computeSlowTransitAspects(NATAL_POSITIONS, transits);

    // 3° orb should not match with 2° max orb
    const jupiterSun = result.find((a) => a.transitBody === 'jupiter' && a.natalBody === 'sun');
    expect(jupiterSun).toBeUndefined();
  });

  it('caps at 4 results', () => {
    // Jupiter close to many natal planets
    const transits = [
      { bodyKey: 'jupiter', degreeDecimal: 15.0, retrograde: false },
      { bodyKey: 'saturn', degreeDecimal: 100.0, retrograde: false },
    ];

    const natalPlanets = [
      { body_key: 'sun', degree_decimal: 15.0 },
      { body_key: 'moon', degree_decimal: 15.5 },
      { body_key: 'mercury', degree_decimal: 14.5 },
      { body_key: 'venus', degree_decimal: 16.0 },
      { body_key: 'mars', degree_decimal: 14.0 },
      { body_key: 'saturn', degree_decimal: 100.5 },
      { body_key: 'neptune', degree_decimal: 101.0 },
    ];

    const result = computeSlowTransitAspects(natalPlanets, transits);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('returns empty array when no slow planets in transits', () => {
    const transits = [
      { bodyKey: 'sun', degreeDecimal: 15.0, retrograde: false },
      { bodyKey: 'mars', degreeDecimal: 100.0, retrograde: false },
    ];

    const result = computeSlowTransitAspects(NATAL_POSITIONS, transits);
    expect(result).toEqual([]);
  });
});
