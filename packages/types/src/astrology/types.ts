import type {
  ASTROLOGY_SUPPORTED_LOCALES,
  CHART_SUBJECT_TYPES,
  READING_TYPES,
  TONE_STYLES,
} from './constants';
import type { HouseSystem } from './constants';

export type AstrologyLocale = (typeof ASTROLOGY_SUPPORTED_LOCALES)[number];
export type ChartSubjectType = (typeof CHART_SUBJECT_TYPES)[number];
export type ReadingType = (typeof READING_TYPES)[number];
export type ToneStyle = (typeof TONE_STYLES)[number];

export interface BirthLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface BirthDataInput extends BirthLocation {
  personName: string;
  birthDate: string;
  birthTime?: string;
  birthTimeKnown: boolean;
  houseSystem: HouseSystem;
  label: string;
  subjectType: ChartSubjectType;
  notes?: string;
}

export interface CalculatedPosition {
  bodyKey: string;
  signKey: string;
  houseNumber?: number;
  degreeDecimal: number;
  retrograde: boolean;
}

export interface CalculatedAspect {
  bodyA: string;
  bodyB: string;
  aspectKey: string;
  orbDecimal: number;
  applying?: boolean;
}

export interface ChartComputationResult {
  provider: string;
  snapshotVersion: number;
  computedChart: Record<string, unknown>;
  warnings: string[];
  positions: CalculatedPosition[];
  aspects: CalculatedAspect[];
}
