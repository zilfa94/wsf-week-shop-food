/**
 * Conversion des quantités de recette vers l'unité canonique de l'ingrédient, et formatage
 * français. Règle (CLAUDE.md § 5.4) : on n'additionne jamais deux quantités sans passer par ici.
 */
import type { CanonicalUnit, Ingredient, Unit } from './types';

/** Facteurs par défaut : 1 <unité> = n <unité canonique>. Le reste vient de `Ingredient.conversions`. */
const DEFAULT_CONVERSIONS: Readonly<Record<CanonicalUnit, Partial<Readonly<Record<Unit, number>>>>> = {
  g: { kg: 1000 },
  ml: { l: 1000, cl: 10, tbsp: 15, tsp: 5 },
  piece: {},
};

export class UnitConversionError extends Error {
  constructor(
    readonly ingredientId: string,
    readonly unit: Unit,
  ) {
    super(`Conversion manquante : ${ingredientId} en ${unit}`);
    this.name = 'UnitConversionError';
  }
}

/** Facteur de conversion de `unit` vers l'unité canonique de `ing`, ou undefined. */
export function conversionFactor(ing: Ingredient, unit: Unit): number | undefined {
  if (unit === ing.canonicalUnit) return 1;
  return ing.conversions[unit] ?? DEFAULT_CONVERSIONS[ing.canonicalUnit][unit];
}

/** Convertit `quantity` (en `unit`) vers l'unité canonique de `ing`. Lève `UnitConversionError` si impossible. */
export function toCanonical(ing: Ingredient, quantity: number, unit: Unit): number {
  const f = conversionFactor(ing, unit);
  if (f === undefined) throw new UnitConversionError(ing.id, unit);
  return quantity * f;
}

/** Nombre en français : virgule décimale, au plus `decimals` décimales, sans zéros inutiles. */
export function formatNumber(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  return String(rounded).replace('.', ',');
}

/** Prix en euros : « 1,50 € ». */
export function formatPrice(eur: number): string {
  return `${eur.toFixed(2).replace('.', ',')} €`;
}

/** Nom d'un ingrédient accordé en nombre. */
export function ingredientName(ing: Pick<Ingredient, 'name' | 'namePlural'>, count: number): string {
  return count > 1 && ing.namePlural ? ing.namePlural : ing.name;
}

/**
 * Quantité canonique lisible : « 380 g », « 1,2 kg », « 250 ml », « 1,5 L », « 6 œufs » (avec ingrédient),
 * « 6 pièces » (sans).
 */
export function formatQuantity(
  value: number,
  unit: CanonicalUnit,
  ing?: Pick<Ingredient, 'name' | 'namePlural'>,
): string {
  switch (unit) {
    case 'g':
      return value >= 1000 ? `${formatNumber(value / 1000, 2)} kg` : `${formatNumber(value, 0)} g`;
    case 'ml':
      return value >= 1000 ? `${formatNumber(value / 1000, 2)} L` : `${formatNumber(value, 0)} ml`;
    case 'piece': {
      const n = formatNumber(value, 1);
      if (ing) return `${n} ${ingredientName(ing, value)}`;
      return `${n} ${value > 1 ? 'pièces' : 'pièce'}`;
    }
  }
}
