/** Recettes et profils synthétiques pour les tests du core. */
import type { Ingredient, Recipe, UserProfile } from '../../types';
import { CHICKEN, CORIANDER, EGG, FLOUR, OIL, PASTA, TOMATO, makeIngredient } from './ingredients';

export const MILK = makeIngredient({
  id: 'lait',
  name: 'lait',
  aisle: 'dairy',
  canonicalUnit: 'ml',
  packaging: { kind: 'pack', size: 1000, price: 1.1, label: 'brique de 1 L' },
  shelfLifeDays: 5,
  foodClass: 'dairy',
  allergens: ['milk'],
});

export const CHICKPEAS = makeIngredient({
  id: 'pois_chiches',
  name: 'pois chiches',
  aisle: 'dry_goods',
  conversions: { can: 265 },
  packaging: { kind: 'pack', size: 265, price: 0.8, label: 'boîte de 265 g' },
});

export const SALMON = makeIngredient({
  id: 'saumon',
  name: 'pavé de saumon',
  aisle: 'fish',
  packaging: { kind: 'bulk', size: 100, price: 2.5, label: 'vrac' },
  shelfLifeDays: 2,
  freezable: true,
  foodClass: 'fish',
  allergens: ['fish'],
});

export const HONEY = makeIngredient({
  id: 'miel',
  name: 'miel',
  aisle: 'sweet_grocery',
  packaging: { kind: 'pack', size: 250, price: 4, label: 'pot de 250 g' },
  foodClass: 'honey',
});

export const FIXTURE_INGREDIENTS: readonly Ingredient[] = [
  PASTA,
  EGG,
  CHICKEN,
  OIL,
  FLOUR,
  CORIANDER,
  TOMATO,
  MILK,
  CHICKPEAS,
  SALMON,
  HONEY,
];

export function makeRecipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'ingredients'>): Recipe {
  return {
    name: overrides.id,
    cuisine: 'french',
    mealTypes: ['dinner'],
    servings: 2,
    prepMin: 10,
    cookMin: 15,
    nutritionPerServing: { kcal: 550, protein: 30, carbs: 60, fat: 18, fiber: 6 },
    mainProtein: 'none',
    baseCarb: 'none',
    seasons: [],
    tags: [],
    batchable: false,
    steps: ['Étape 1.'],
    ...overrides,
  };
}

export const CHICKEN_PASTA = makeRecipe({
  id: 'pates_poulet',
  name: 'Pâtes au poulet et tomates',
  ingredients: [
    { ingredientId: 'pates_penne', quantity: 200, unit: 'g' },
    { ingredientId: 'poulet_blanc', quantity: 300, unit: 'g' },
    { ingredientId: 'tomate', quantity: 3, unit: 'piece' },
    { ingredientId: 'huile_olive', quantity: 2, unit: 'tbsp' },
    { ingredientId: 'coriandre', quantity: 2, unit: 'tbsp', optional: true },
  ],
  mainProtein: 'poultry',
  baseCarb: 'pasta',
  mealTypes: ['lunch', 'dinner'],
  batchable: true,
});

export const OMELETTE = makeRecipe({
  id: 'omelette',
  name: 'Omelette',
  ingredients: [
    { ingredientId: 'oeuf', quantity: 4, unit: 'piece' },
    { ingredientId: 'lait', quantity: 2, unit: 'tbsp', optional: true },
    { ingredientId: 'huile_olive', quantity: 1, unit: 'tsp' },
  ],
  mainProtein: 'egg',
  mealTypes: ['breakfast', 'dinner'],
  prepMin: 5,
  cookMin: 5,
  tags: ['quick'],
});

export const CHICKPEA_CURRY = makeRecipe({
  id: 'curry_pois_chiches',
  name: 'Curry de pois chiches',
  ingredients: [
    { ingredientId: 'pois_chiches', quantity: 2, unit: 'can' },
    { ingredientId: 'tomate', quantity: 4, unit: 'piece' },
    { ingredientId: 'coriandre', quantity: 1, unit: 'bunch' },
    { ingredientId: 'huile_olive', quantity: 1, unit: 'tbsp' },
  ],
  cuisine: 'indian',
  mainProtein: 'legume',
  baseCarb: 'legume',
  mealTypes: ['lunch', 'dinner'],
  prepMin: 15,
  cookMin: 40,
  batchable: true,
});

export const SALMON_DISH = makeRecipe({
  id: 'saumon_poele',
  name: 'Saumon poêlé',
  ingredients: [
    { ingredientId: 'saumon', quantity: 250, unit: 'g' },
    { ingredientId: 'huile_olive', quantity: 1, unit: 'tbsp' },
  ],
  mainProtein: 'fish',
  seasons: ['autumn', 'winter'],
});

export const HONEY_PANCAKES = makeRecipe({
  id: 'pancakes_miel',
  name: 'Pancakes au miel',
  ingredients: [
    { ingredientId: 'farine', quantity: 150, unit: 'g' },
    { ingredientId: 'oeuf', quantity: 1, unit: 'piece' },
    { ingredientId: 'lait', quantity: 200, unit: 'ml' },
    { ingredientId: 'miel', quantity: 2, unit: 'tbsp' },
  ],
  mealTypes: ['breakfast'],
  mainProtein: 'egg',
  baseCarb: 'bread',
  prepMin: 10,
  cookMin: 10,
});

export const FIXTURE_RECIPES: readonly Recipe[] = [CHICKEN_PASTA, OMELETTE, CHICKPEA_CURRY, SALMON_DISH, HONEY_PANCAKES];

export const OMNIVORE_2: UserProfile = {
  persons: 2,
  diet: 'omnivore',
  allergens: [],
  dislikedIngredientIds: [],
  goal: 'balance',
  maxCookMinWeekday: 30,
  maxCookMinWeekend: 90,
  includeBreakfast: true,
  includeSnack: false,
  allowBatchCooking: true,
  assumeStaples: true,
};

export const VEGAN_GF_1: UserProfile = {
  ...OMNIVORE_2,
  persons: 1,
  diet: 'vegan',
  allergens: ['gluten'],
  maxCookMinWeekday: 45,
  maxCookMinWeekend: 60,
};
