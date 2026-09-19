/**
 * Arrondi d'un besoin aux conditionnements réels, prix, périssabilité d'un reste.
 */
import type { Ingredient, Packaging } from './types';
import { formatQuantity } from './units';

/** Tolérance numérique : évite qu'un besoin de 500,0000001 g exige 2 paquets de 500 g. */
export const EPS = 1e-6;

/** Conditionnements disponibles pour un ingrédient, le défaut en premier. */
export function packagingsOf(ing: Ingredient): readonly Packaging[] {
  return [ing.packaging, ...(ing.altPackagings ?? [])];
}

/** Nombre de conditionnements et quantité achetée pour couvrir `toBuy` (unité canonique). */
export function roundToPackaging(packaging: Packaging, toBuy: number): { packs: number; bought: number } {
  if (toBuy <= EPS) return { packs: 0, bought: 0 };
  const packs = Math.ceil(toBuy / packaging.size - EPS);
  return { packs, bought: packs * packaging.size };
}

/** Prix d'une unité canonique (€/g, €/ml, €/pièce). */
export function unitPrice(packaging: Packaging): number {
  return packaging.price / packaging.size;
}

/**
 * Probabilité de perte réelle d'un reste (0..1) : un reste de pâtes ne coûte rien, un reste de
 * coriandre vaut sa valeur pleine. Un congelable est sauvé aux trois quarts.
 */
export function perishFactor(ing: Pick<Ingredient, 'staple' | 'freezable' | 'shelfLifeDays'>): number {
  if (ing.staple) return 0;
  if (ing.freezable) return 0.25;
  if (ing.shelfLifeDays <= 5) return 1;
  if (ing.shelfLifeDays <= 14) return 0.6;
  if (ing.shelfLifeDays <= 60) return 0.2;
  return 0.05;
}

/** Libellé d'achat : « 2 × paquet de 500 g », « botte », « 400 g » (vrac), « 6 œufs ». */
export function formatPacks(ing: Ingredient, packaging: Packaging, packs: number): string {
  if (packs <= 0) return '';
  if (packaging.kind === 'bulk') return formatQuantity(packs * packaging.size, ing.canonicalUnit, ing);
  if (ing.canonicalUnit === 'piece' && packs === 1) return packaging.label;
  return packs > 1 ? `${packs} × ${packaging.label}` : packaging.label;
}
