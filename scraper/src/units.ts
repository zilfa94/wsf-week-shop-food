/**
 * Lecture des conditionnements et prix unitaires tels qu'affichés par les enseignes.
 * On ne devine rien : si le texte n'est pas compris, on renvoie `null` et le produit est ignoré.
 */
import type { PriceUnit } from './types.ts';

export interface PackInfo {
  unit: PriceUnit;
  /** Contenu en unité de référence (kg, l ou pièces). */
  size: number;
}

const num = (s: string): number => Number(s.replace(/\s/g, '').replace(',', '.'));

/**
 * « 750 g », « 1,2 kg », « 6 x 125 g », « 1 L », « 50 cl », « 2 x 1 l », « 12 pièces », « La pièce », « L'unité ».
 * Les mentions « (PNE) », « environ », « env. » sont tolérées.
 */
export function parsePack(label: string): PackInfo | null {
  const t = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/\(pne\)|poids net egoutte|environ|env\.|approx\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = t.match(/(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|l|cl|ml|pieces?|pcs?|unites?|oeufs?)\b/);
  if (m) {
    const count = m[1] ? Number(m[1]) : 1;
    const qty = num(m[2]!) * count;
    const u = m[3]!;
    if (u === 'kg') return { unit: 'kg', size: qty };
    if (u === 'g') return { unit: 'kg', size: qty / 1000 };
    if (u === 'l') return { unit: 'l', size: qty };
    if (u === 'cl') return { unit: 'l', size: qty / 100 };
    if (u === 'ml') return { unit: 'l', size: qty / 1000 };
    return { unit: 'piece', size: qty };
  }
  if (/^(la piece|l unite|la botte|le sachet|la barquette|le lot)\b/.test(t)) {
    return { unit: 'piece', size: 1 };
  }
  return null;
}

export interface UnitPriceInfo {
  unit: PriceUnit;
  /** € par unité de référence. */
  price: number;
}

/** « 1 kg = 7,32 € », « 1 L = 4,76 », « 7,32 €/kg », « Le kg : 7,32 € ». */
export function parseUnitPrice(text: string): UnitPriceInfo | null {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  let m = t.match(/1 (kg|l|litre|piece|pièce) ?= ?(\d+(?:[.,]\d+)?)/);
  if (!m) m = t.match(/(\d+(?:[.,]\d+)?) ?€? ?(?:\/|le |la |par )(kg|l|litre|piece|pièce)\b/);
  if (!m) return null;
  const a = m[1]!;
  const b = m[2]!;
  const unitText = /^\d/.test(a) ? b : a;
  const priceText = /^\d/.test(a) ? a : b;
  const unit: PriceUnit = unitText === 'kg' ? 'kg' : unitText.startsWith('l') ? 'l' : 'piece';
  const price = num(priceText);
  return Number.isFinite(price) && price > 0 ? { unit, price } : null;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;
