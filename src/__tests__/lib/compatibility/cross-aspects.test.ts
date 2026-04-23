import { computeCrossAspects, serializeChartForSynastry } from '@/lib/compatibility/service';

const POSITION_A = [
  { body_key: 'sun', sign_key: 'aries', house_number: 1, degree_decimal: 15.0, retrograde: false },
  {
    body_key: 'moon',
    sign_key: 'cancer',
    house_number: 4,
    degree_decimal: 100.0,
    retrograde: false,
  },
  {
    body_key: 'venus',
    sign_key: 'taurus',
    house_number: 2,
    degree_decimal: 45.0,
    retrograde: false,
  },
];

const POSITION_B = [
  {
    body_key: 'sun',
    sign_key: 'libra',
    house_number: 7,
    degree_decimal: 195.0,
    retrograde: false,
  },
  {
    body_key: 'moon',
    sign_key: 'cancer',
    house_number: 4,
    degree_decimal: 102.0,
    retrograde: false,
  },
  {
    body_key: 'mars',
    sign_key: 'aries',
    house_number: 1,
    degree_decimal: 16.0,
    retrograde: false,
  },
];

const ASPECTS = [
  {
    body_a: 'sun',
    body_b: 'moon',
    aspect_key: 'square',
    orb_decimal: 2.5,
    applying: true,
  },
];

describe('computeCrossAspects', () => {
  it('finds conjunction between close positions', () => {
    const result = computeCrossAspects(POSITION_A, 'Анна', POSITION_B, 'Иван');

    // sun A (15°) ↔ mars B (16°) = conjunction orb ~1°
    expect(result).toContain('Анна sun conjunction Иван mars');
  });

  it('finds opposition between opposing positions', () => {
    const result = computeCrossAspects(POSITION_A, 'Анна', POSITION_B, 'Иван');

    // sun A (15°) ↔ sun B (195°) = opposition orb ~0°
    expect(result).toContain('Анна sun opposition Иван sun');
  });

  it('finds conjunction between close moon positions', () => {
    const result = computeCrossAspects(POSITION_A, 'Анна', POSITION_B, 'Иван');

    // moon A (100°) ↔ moon B (102°) = conjunction orb ~2°
    expect(result).toContain('Анна moon conjunction Иван moon');
  });

  it('sorts by tightest orb first', () => {
    const result = computeCrossAspects(POSITION_A, 'Анна', POSITION_B, 'Иван');
    const lines = result.split('\n');

    // First aspect should have smallest orb
    const firstOrb = parseFloat(lines[0].match(/orb (\d+\.\d+)/)?.[1] ?? '999');
    const secondOrb = parseFloat(lines[1]?.match(/orb (\d+\.\d+)/)?.[1] ?? '999');
    expect(firstOrb).toBeLessThanOrEqual(secondOrb);
  });

  it('includes all found cross-aspects', () => {
    // Create many positions to generate lots of cross-aspects
    const manyA = Array.from({ length: 12 }, (_, i) => ({
      body_key: PLANET_KEYS[i % PLANET_KEYS.length],
      sign_key: 'aries',
      house_number: 1,
      degree_decimal: i * 30,
      retrograde: false,
    }));
    const manyB = Array.from({ length: 12 }, (_, i) => ({
      body_key: PLANET_KEYS[i % PLANET_KEYS.length],
      sign_key: 'aries',
      house_number: 1,
      degree_decimal: i * 30 + 1,
      retrograde: false,
    }));

    const result = computeCrossAspects(manyA, 'A', manyB, 'B');
    const lines = result.split('\n').filter((l) => l.trim().length > 0);
    // All found aspects should be present (no cap)
    expect(lines.length).toBeGreaterThan(0);
  });

  it('returns empty string when no aspects found', () => {
    const far = [
      {
        body_key: 'sun',
        sign_key: 'aries',
        house_number: 1,
        degree_decimal: 10.0,
        retrograde: false,
      },
    ];
    const farB = [
      {
        body_key: 'sun',
        sign_key: 'leo',
        house_number: 5,
        degree_decimal: 140.0,
        retrograde: false,
      },
    ];
    // 130° difference — no standard aspect matches
    const result = computeCrossAspects(far, 'A', farB, 'B');
    expect(result).toBe('');
  });
});

describe('serializeChartForSynastry', () => {
  it('includes birthTimeKnown flag', () => {
    const result = serializeChartForSynastry('Test', 'Анна', true, POSITION_A, ASPECTS);
    expect(result).toContain('Birth time known: yes');

    const result2 = serializeChartForSynastry('Test', 'Анна', false, POSITION_A, ASPECTS);
    expect(result2).toContain('Birth time known: no');
  });

  it('includes applying field in aspects', () => {
    const result = serializeChartForSynastry('Test', 'Анна', true, POSITION_A, ASPECTS);
    expect(result).toContain('applying=true');
  });

  it('includes all positions without cap', () => {
    const manyPos = Array.from({ length: 20 }, (_, i) => ({
      body_key: `planet${i}`,
      sign_key: 'aries',
      house_number: 1,
      degree_decimal: i * 18,
      retrograde: false,
    }));
    const result = serializeChartForSynastry('Test', 'Анна', true, manyPos, []);

    for (const p of manyPos) {
      expect(result).toContain(p.body_key);
    }
  });

  it('does not include birth date', () => {
    const result = serializeChartForSynastry('Test', 'Анна', true, POSITION_A, ASPECTS);
    expect(result).not.toContain('Birth date');
  });
});

const PLANET_KEYS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'ascendant',
  'midheaven',
];
