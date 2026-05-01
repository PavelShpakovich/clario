import { useColorScheme } from 'react-native';

// Design tokens matching the web app's CSS variables
// Primary: oklch(0.52 0.2 85) ≈ rich amber-gold

type ColorScheme = typeof lightColors;

const lightColors = {
  // Brand — amber/gold (web --primary light mode)
  primary: '#9A6500',
  primaryForeground: '#FAFAFA',
  primarySubtle: '#FEF9EE', // bg-primary/10 — very light amber tint
  primaryTint: '#F5E9C8', // bg-primary/20 — used for active tab, chips

  // Page surfaces
  background: '#FAFAFA', // --background
  card: '#FFFFFF', // --card
  muted: '#F1F2F6', // --muted (muted bg)
  skeleton: '#EDEEF3', // skeleton placeholder (subtle)

  // Text
  foreground: '#0F1729', // --foreground (primary text)
  mutedForeground: '#6B7280', // --muted-foreground (labels, subtext)

  // Borders
  border: '#D9DCE6', // --border
  input: '#D9DCE6', // --input

  // Semantic
  destructive: '#C0392B', // --destructive
  destructiveForeground: '#FAFAFA',
  destructiveSubtle: '#FEE2E2',
  success: '#16A34A',
  successSubtle: '#DCFCE7',
  warning: '#B07800',
  warningSubtle: '#FEF3C7',

  // Element colors for zodiac charts
  fire: '#F97316', // orange-500
  fireSubtle: '#FFEDD5', // orange-100
  earth: '#10B981', // emerald-500
  earthSubtle: '#D1FAE5', // emerald-100
  air: '#0EA5E9', // sky-500
  airSubtle: '#E0F2FE', // sky-100
  water: '#6366F1', // indigo-500
  waterSubtle: '#EEF2FF', // indigo-50

  error: '#C0392B',
  placeholder: '#6B7280',
};

const darkColors: ColorScheme = {
  // Brand — warm gold on dark (web --primary dark mode)
  primary: '#D4A017',
  primaryForeground: '#1A1000',
  primarySubtle: '#2A1F00',
  primaryTint: '#332500',

  // Page surfaces — deep indigo-navy (web --background dark)
  background: '#0D1117',
  card: '#161B22',
  muted: '#21262D',
  skeleton: 'rgba(255,255,255,0.07)', // subtle on dark bg

  // Text
  foreground: '#E6EDF3',
  mutedForeground: '#8B949E',

  // Borders
  border: 'rgba(255,255,255,0.09)',
  input: 'rgba(255,255,255,0.11)',

  // Semantic
  destructive: '#F85149',
  destructiveForeground: '#F0F6FC',
  destructiveSubtle: '#3D0000',
  success: '#3FB950',
  successSubtle: '#0A2A0F',
  warning: '#D29922',
  warningSubtle: '#272115',

  // Element colors — slightly adjusted for dark bg legibility
  fire: '#FB923C',
  fireSubtle: '#3B1A00',
  earth: '#34D399',
  earthSubtle: '#00261A',
  air: '#38BDF8',
  airSubtle: '#00202E',
  water: '#818CF8',
  waterSubtle: '#1A1C40',

  error: '#F85149',
  placeholder: '#8B949E',
};

/** Static export — light theme. Use for StyleSheet.create at module level. */
export const colors = lightColors;

/** Reactive hook — returns correct colors for current system theme. */
export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export type { ColorScheme as Colors };

// Shadow style for cards (iOS + Android)
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

// Stronger shadow for modals / dialogs
export const elevatedShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
};
