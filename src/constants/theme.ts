/**
 * Design system (docs/SPEC.md § 6) : palette clair/sombre, espacements, rayons, typographie.
 * Police système ; chiffres tabulaires pour les quantités et les prix.
 */

import '@/global.css';

import { Platform } from 'react-native';

export interface ThemeColors {
  readonly bg: string;
  readonly surface: string;
  readonly surfaceAlt: string;
  readonly primary: string;
  readonly primarySoft: string;
  readonly onPrimary: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly protein: string;
  readonly carbs: string;
  readonly fat: string;
}

export const Colors: Readonly<Record<'light' | 'dark', ThemeColors>> = {
  light: {
    bg: '#F7F8F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2E6',
    primary: '#2F6B3A',
    primarySoft: '#DCEBDD',
    onPrimary: '#FFFFFF',
    accent: '#E8843A',
    accentSoft: '#FBE7D6',
    text: '#1E241C',
    textMuted: '#6B7366',
    border: '#DDE2D5',
    success: '#3E8E52',
    warning: '#D9A400',
    danger: '#C7423B',
    protein: '#4E7CB8',
    carbs: '#D9A400',
    fat: '#B8654E',
  },
  dark: {
    bg: '#121611',
    surface: '#1B211A',
    surfaceAlt: '#232B22',
    primary: '#7FBF8A',
    primarySoft: '#24402A',
    onPrimary: '#0F1A11',
    accent: '#F2A063',
    accentSoft: '#4A2E1A',
    text: '#EDF0E8',
    textMuted: '#A2AA9C',
    border: '#2E372C',
    success: '#8CD09A',
    warning: '#F0C64A',
    danger: '#EE8079',
    protein: '#7FA6D8',
    carbs: '#F0C64A',
    fat: '#D48C74',
  },
};

export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Échelle 4 : xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  card: 12,
  button: 14,
  chip: 20,
  sheet: 28,
} as const;

/** Tailles / interlignes ; les quantités et prix ajoutent `fontVariant: ['tabular-nums']`. */
export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Cible tactile minimale (pt). */
export const TouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
