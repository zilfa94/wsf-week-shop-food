/**
 * Dates locales au format `YYYY-MM-DD` (type `ISODate`). Jamais de `new Date('YYYY-MM-DD')`
 * (interprété en UTC → décalage d'un jour le soir) : on construit toujours via `new Date(y, m - 1, d)`.
 * Le core ne lit jamais l'horloge : `today` est injecté par l'appelant.
 */
import type { ISODate, Season, Weekday } from './types';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): value is ISODate {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function parseISO(iso: ISODate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Date invalide : ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toISO(date: Date): ISODate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from);
  const b = parseISO(to);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayOf(iso: ISODate): Weekday {
  const js = parseISO(iso).getDay(); // 0 = dimanche
  return ((js + 6) % 7) as Weekday;
}

/** Début de la semaine contenant `iso`, pour un jour de début donné (0 = lundi par défaut). */
export function weekStartFor(iso: ISODate, startDay: Weekday = 0): ISODate {
  const offset = (weekdayOf(iso) - startDay + 7) % 7;
  return addDays(iso, -offset);
}

/** Saison météorologique : mars-mai printemps, juin-août été, sept.-nov. automne, déc.-fév. hiver. */
export function seasonOf(iso: ISODate): Season {
  const month = parseISO(iso).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Comparaison lexicographique valide pour des ISODate bien formées. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** « 19 nov. » — jour et mois courts pour une date ISO, sans dépendre de la locale de l'appareil. */
export function formatDayMonth(iso: ISODate): string {
  const d = parseISO(iso);
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${d.getDate()} ${months[d.getMonth()] ?? ''}`;
}
