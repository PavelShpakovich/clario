import {
  normalizeBirthTime,
  normalizeCreateChartBirthTime,
  normalizeUpdateChartBirthTime,
  resolveChartTimezone,
} from '@clario/validation';

describe('chart input normalization helpers', () => {
  describe('normalizeBirthTime', () => {
    it('keeps HH:MM values unchanged', () => {
      expect(normalizeBirthTime('14:30')).toBe('14:30');
    });

    it('strips seconds from HH:MM:SS values', () => {
      expect(normalizeBirthTime('14:30:45')).toBe('14:30');
    });

    it('returns an empty string for missing values', () => {
      expect(normalizeBirthTime(undefined)).toBe('');
      expect(normalizeBirthTime(null)).toBe('');
    });
  });

  describe('resolveChartTimezone', () => {
    it('prefers an explicit timezone when present', () => {
      expect(resolveChartTimezone('Europe/Paris', 'Belarus')).toBe('Europe/Paris');
    });

    it('falls back to country timezone when timezone is missing', () => {
      expect(resolveChartTimezone(undefined, 'Беларусь')).toBe('Europe/Minsk');
      expect(resolveChartTimezone('', 'Ukraine')).toBe('Europe/Kyiv');
    });

    it('returns undefined when there is no explicit or fallback timezone', () => {
      expect(resolveChartTimezone(undefined, 'Unknownland')).toBeUndefined();
      expect(resolveChartTimezone(undefined, undefined)).toBeUndefined();
    });
  });

  describe('birth time payload normalization', () => {
    it('omits create-time birthTime when time is unknown', () => {
      expect(normalizeCreateChartBirthTime(false, '14:30')).toBeUndefined();
      expect(normalizeCreateChartBirthTime(false, undefined)).toBeUndefined();
    });

    it('normalizes create-time birthTime when time is known', () => {
      expect(normalizeCreateChartBirthTime(true, '14:30:45')).toBe('14:30');
    });

    it('nulls update-time birthTime when time is unknown', () => {
      expect(normalizeUpdateChartBirthTime(false, '14:30')).toBeNull();
      expect(normalizeUpdateChartBirthTime(false, undefined)).toBeNull();
    });

    it('normalizes update-time birthTime when time is known', () => {
      expect(normalizeUpdateChartBirthTime(true, '08:05:09')).toBe('08:05');
    });
  });
});
