/** Ingrédients synthétiques pour les tests du core (indépendants du vrai jeu de données). */
import type { Ingredient } from '../../types';

export function makeIngredient(overrides: Partial<Ingredient> & Pick<Ingredient, 'id'>): Ingredient {
  return {
    name: overrides.id,
    aisle: 'other',
    canonicalUnit: 'g',
    conversions: {},
    packaging: { kind: 'pack', size: 500, price: 1, label: 'paquet de 500 g' },
    shelfLifeDays: 365,
    freezable: false,
    staple: false,
    foodClass: 'plant',
    allergens: [],
    ...overrides,
  };
}

export const PASTA = makeIngredient({
  id: 'pates_penne',
  name: 'penne',
  aisle: 'dry_goods',
  packaging: { kind: 'pack', size: 500, price: 1.2, label: 'paquet de 500 g' },
  allergens: ['gluten'],
});

export const EGG = makeIngredient({
  id: 'oeuf',
  name: 'œuf',
  namePlural: 'œufs',
  aisle: 'dairy',
  canonicalUnit: 'piece',
  packaging: { kind: 'pack', size: 6, price: 2.1, label: 'boîte de 6' },
  altPackagings: [{ kind: 'pack', size: 12, price: 3.9, label: 'boîte de 12' }],
  shelfLifeDays: 28,
  foodClass: 'egg',
  allergens: ['egg'],
});

export const CHICKEN = makeIngredient({
  id: 'poulet_blanc',
  name: 'blanc de poulet',
  aisle: 'butcher',
  packaging: { kind: 'bulk', size: 100, price: 1.2, label: 'vrac' },
  shelfLifeDays: 3,
  freezable: true,
  foodClass: 'poultry',
});

export const OIL = makeIngredient({
  id: 'huile_olive',
  name: "huile d'olive",
  aisle: 'condiments',
  canonicalUnit: 'ml',
  packaging: { kind: 'pack', size: 750, price: 6.5, label: 'bouteille de 75 cl' },
  staple: true,
});

export const FLOUR = makeIngredient({
  id: 'farine',
  name: 'farine',
  aisle: 'dry_goods',
  conversions: { tbsp: 8, tsp: 3 },
  packaging: { kind: 'pack', size: 1000, price: 0.9, label: 'paquet de 1 kg' },
  allergens: ['gluten'],
});

export const CORIANDER = makeIngredient({
  id: 'coriandre',
  name: 'coriandre',
  aisle: 'fruits_vegetables',
  conversions: { bunch: 30, tbsp: 4 },
  packaging: { kind: 'pack', size: 30, price: 0.9, label: 'botte' },
  shelfLifeDays: 4,
});

export const TOMATO = makeIngredient({
  id: 'tomate',
  name: 'tomate',
  namePlural: 'tomates',
  aisle: 'fruits_vegetables',
  conversions: { piece: 120 },
  packaging: { kind: 'bulk', size: 100, price: 0.3, label: 'vrac' },
  shelfLifeDays: 6,
  seasons: ['summer', 'autumn'],
});
