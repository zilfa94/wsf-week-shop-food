/**
 * Design system (docs/SPEC.md § 6, refonte du 2026-09-20 sur le modèle « Food Delivery App UI/UX » fourni
 * par le propriétaire) : fond gris très clair, cartes blanches très arrondies à ombre douce, accent jaune,
 * titres gras anthracite, photos de produits. Police système arrondie ; chiffres tabulaires pour les
 * quantités et les prix. Le texte sur jaune est anthracite (le blanc du modèle n'est pas lisible).
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
  /** Fond teinté d'une information positive (score anti-gaspi, économie réalisée). */
  readonly successSoft: string;
  /** Fond teinté d'un chiffre neutre (budget, compteurs) : évite la grisaille des cartes toutes identiques. */
  readonly infoSoft: string;
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
    bg: '#F4F5F7',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEFF3',
    primary: '#FFC529',
    primarySoft: '#FFF3C9',
    onPrimary: '#26231C',
    accent: '#FF6B4A',
    accentSoft: '#FFE9E2',
    successSoft: '#E1F6EA',
    infoSoft: '#E7EEFC',
    text: '#2B2B2E',
    textMuted: '#8C8C93',
    border: '#ECECF0',
    success: '#2FB673',
    warning: '#F5A623',
    danger: '#F04E45',
    protein: '#5B8DEF',
    carbs: '#FFC529',
    fat: '#FF8A5B',
  },
  dark: {
    // Surfaces volontairement plus claires que le fond : sur un thème sombre, des cartes trop proches
    // du noir donnent un écran terne et illisible (retour du propriétaire, 2026-09-24).
    bg: '#0F0F12',
    surface: '#1E1E26',
    surfaceAlt: '#282833',
    primary: '#FFC529',
    primarySoft: '#42371A',
    onPrimary: '#1F1C14',
    accent: '#FF8566',
    accentSoft: '#5A382E',
    successSoft: '#1B3E2E',
    infoSoft: '#22304C',
    text: '#F4F4F8',
    textMuted: '#A3A3AE',
    border: '#35353F',
    success: '#4FD08A',
    warning: '#FFC04D',
    danger: '#FF7169',
    protein: '#7FA6F0',
    carbs: '#FFD166',
    fat: '#FFA07A',
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
  card: 22,
  button: 18,
  chip: 14,
  image: 18,
  sheet: 28,
  pill: 999,
} as const;

/** Ombres douces du modèle (cartes posées sur le fond gris) ; `elevation` pour Android. */
export const Shadow = {
  card: {
    shadowColor: '#1B1B33',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  float: {
    shadowColor: '#E0A800',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

const rounded = Fonts?.rounded;

/** Tailles / interlignes ; les quantités et prix ajoutent `fontVariant: ['tabular-nums']`. */
export const Typography = {
  display: { fontFamily: rounded, fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  h1: { fontFamily: rounded, fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h2: { fontFamily: rounded, fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontFamily: rounded, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontFamily: rounded, fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontFamily: rounded, fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Cible tactile minimale (pt). */
export const TouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
