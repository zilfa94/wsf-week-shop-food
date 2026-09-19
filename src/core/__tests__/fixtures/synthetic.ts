/**
 * Jeu de données synthétique mais réaliste (≈ 34 recettes, 21 ingrédients) pour tester le
 * planificateur, la liste de courses et le swap sans dépendre des vraies données.
 */
import type { CarbKind, Cuisine, Dataset, Ingredient, ProteinKind, Recipe, RecipeIngredient } from '../../types';
import { makeIngredient } from './ingredients';
import { FIXTURE_INGREDIENTS, makeRecipe } from './recipes';

const EXTRA_INGREDIENTS: readonly Ingredient[] = [
  makeIngredient({ id: 'courgette', name: 'courgette', aisle: 'fruits_vegetables', conversions: { piece: 200 }, packaging: { kind: 'bulk', size: 100, price: 0.25, label: 'vrac' }, shelfLifeDays: 7 }),
  makeIngredient({ id: 'oignon', name: 'oignon', aisle: 'fruits_vegetables', conversions: { piece: 150 }, packaging: { kind: 'bulk', size: 100, price: 0.15, label: 'vrac' }, shelfLifeDays: 30 }),
  makeIngredient({ id: 'pommes', name: 'pomme', namePlural: 'pommes', aisle: 'fruits_vegetables', conversions: { piece: 150 }, packaging: { kind: 'bulk', size: 100, price: 0.3, label: 'vrac' }, shelfLifeDays: 14 }),
  makeIngredient({ id: 'banane', name: 'banane', namePlural: 'bananes', aisle: 'fruits_vegetables', canonicalUnit: 'piece', packaging: { kind: 'bulk', size: 1, price: 0.3, label: 'pièce' }, shelfLifeDays: 5 }),
  makeIngredient({ id: 'citron', name: 'citron', namePlural: 'citrons', aisle: 'fruits_vegetables', canonicalUnit: 'piece', packaging: { kind: 'bulk', size: 1, price: 0.5, label: 'pièce' }, shelfLifeDays: 14 }),
  makeIngredient({ id: 'creme', name: 'crème fraîche', aisle: 'dairy', canonicalUnit: 'ml', packaging: { kind: 'pack', size: 200, price: 1, label: 'pot de 20 cl' }, shelfLifeDays: 5, foodClass: 'dairy', allergens: ['milk'] }),
  makeIngredient({ id: 'fromage_rape', name: 'fromage râpé', aisle: 'dairy', packaging: { kind: 'pack', size: 200, price: 2.2, label: 'sachet de 200 g' }, shelfLifeDays: 21, freezable: true, foodClass: 'dairy', allergens: ['milk'] }),
  makeIngredient({ id: 'yaourt', name: 'yaourt', namePlural: 'yaourts', aisle: 'dairy', canonicalUnit: 'piece', packaging: { kind: 'pack', size: 4, price: 1.6, label: 'pack de 4' }, shelfLifeDays: 14, foodClass: 'dairy', allergens: ['milk'] }),
  makeIngredient({ id: 'riz', name: 'riz', aisle: 'dry_goods', packaging: { kind: 'pack', size: 1000, price: 2.2, label: 'paquet de 1 kg' } }),
  makeIngredient({ id: 'pain', name: 'pain', aisle: 'bakery', conversions: { slice: 30 }, packaging: { kind: 'pack', size: 400, price: 1.3, label: 'pain de 400 g' }, shelfLifeDays: 3, freezable: true, allergens: ['gluten'] }),
];

export const SYNTHETIC_INGREDIENTS: readonly Ingredient[] = [...FIXTURE_INGREDIENTS, ...EXTRA_INGREDIENTS];

const PROTEINS: readonly { kind: ProteinKind; ing: RecipeIngredient }[] = [
  { kind: 'poultry', ing: { ingredientId: 'poulet_blanc', quantity: 400, unit: 'g' } },
  { kind: 'fish', ing: { ingredientId: 'saumon', quantity: 400, unit: 'g' } },
  { kind: 'egg', ing: { ingredientId: 'oeuf', quantity: 6, unit: 'piece' } },
  { kind: 'legume', ing: { ingredientId: 'pois_chiches', quantity: 2, unit: 'can' } },
  { kind: 'dairy', ing: { ingredientId: 'fromage_rape', quantity: 150, unit: 'g' } },
];
const CARBS: readonly { kind: CarbKind; ing: RecipeIngredient }[] = [
  { kind: 'pasta', ing: { ingredientId: 'pates_penne', quantity: 320, unit: 'g' } },
  { kind: 'rice', ing: { ingredientId: 'riz', quantity: 300, unit: 'g' } },
  { kind: 'bread', ing: { ingredientId: 'pain', quantity: 6, unit: 'slice' } },
  { kind: 'legume', ing: { ingredientId: 'pois_chiches', quantity: 1, unit: 'can' } },
];
const VEGGIES: readonly RecipeIngredient[] = [
  { ingredientId: 'tomate', quantity: 4, unit: 'piece' },
  { ingredientId: 'courgette', quantity: 2, unit: 'piece' },
  { ingredientId: 'oignon', quantity: 1, unit: 'piece' },
  { ingredientId: 'coriandre', quantity: 0.5, unit: 'bunch' },
];
const EXTRAS: readonly RecipeIngredient[] = [
  { ingredientId: 'creme', quantity: 10, unit: 'cl' },
  { ingredientId: 'citron', quantity: 1, unit: 'piece' },
  { ingredientId: 'huile_olive', quantity: 2, unit: 'tbsp' },
];
const CUISINES: readonly Cuisine[] = ['french', 'italian', 'asian', 'oriental'];

function mains(): Recipe[] {
  const out: Recipe[] = [];
  for (let i = 0; i < 22; i++) {
    const protein = PROTEINS[i % PROTEINS.length]!;
    const carb = CARBS[(i * 3) % CARBS.length]!;
    const ingredients: RecipeIngredient[] = [
      protein.ing,
      carb.ing,
      VEGGIES[i % VEGGIES.length]!,
      VEGGIES[(i + 1) % VEGGIES.length]!,
      EXTRAS[i % EXTRAS.length]!,
    ];
    const minutes = 10 + (i % 5) * 10; // 10..50
    out.push(
      makeRecipe({
        id: `plat_${i}`,
        name: `Plat ${i}`,
        ingredients,
        servings: 4,
        mealTypes: ['lunch', 'dinner'],
        cuisine: CUISINES[i % CUISINES.length]!,
        mainProtein: protein.kind,
        baseCarb: carb.kind,
        prepMin: 10,
        cookMin: minutes,
        batchable: i % 3 === 0,
        nutritionPerServing: { kcal: 520 + (i % 4) * 60, protein: 28 + (i % 3) * 6, carbs: 55 + (i % 5) * 5, fat: 16 + (i % 4) * 3, fiber: 5 + (i % 4) * 2 },
      }),
    );
  }
  return out;
}

function breakfasts(): Recipe[] {
  const bases: RecipeIngredient[][] = [
    [{ ingredientId: 'pain', quantity: 2, unit: 'slice' }, { ingredientId: 'miel', quantity: 1, unit: 'tbsp' }],
    [{ ingredientId: 'yaourt', quantity: 1, unit: 'piece' }, { ingredientId: 'banane', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'oeuf', quantity: 2, unit: 'piece' }, { ingredientId: 'pain', quantity: 1, unit: 'slice' }],
    [{ ingredientId: 'farine', quantity: 100, unit: 'g' }, { ingredientId: 'lait', quantity: 200, unit: 'ml' }, { ingredientId: 'oeuf', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'pommes', quantity: 1, unit: 'piece' }, { ingredientId: 'yaourt', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'pain', quantity: 2, unit: 'slice' }, { ingredientId: 'fromage_rape', quantity: 30, unit: 'g' }],
    [{ ingredientId: 'banane', quantity: 1, unit: 'piece' }, { ingredientId: 'lait', quantity: 250, unit: 'ml' }],
    [{ ingredientId: 'pommes', quantity: 1, unit: 'piece' }, { ingredientId: 'miel', quantity: 1, unit: 'tsp' }],
  ];
  return bases.map((ingredients, i) =>
    makeRecipe({
      id: `pdj_${i}`,
      name: `Petit-déjeuner ${i}`,
      ingredients,
      servings: 1,
      mealTypes: ['breakfast'],
      mainProtein: i === 2 || i === 3 ? 'egg' : 'none',
      baseCarb: i === 0 || i === 2 || i === 5 ? 'bread' : 'none',
      prepMin: 5,
      cookMin: i === 2 || i === 3 ? 5 : 0,
      tags: ['quick'],
      nutritionPerServing: { kcal: 350 + (i % 3) * 40, protein: 12 + (i % 3) * 4, carbs: 45, fat: 10, fiber: 4 },
    }),
  );
}

function snacks(): Recipe[] {
  const bases: RecipeIngredient[][] = [
    [{ ingredientId: 'yaourt', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'banane', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'pommes', quantity: 1, unit: 'piece' }],
    [{ ingredientId: 'pain', quantity: 1, unit: 'slice' }, { ingredientId: 'miel', quantity: 1, unit: 'tsp' }],
  ];
  return bases.map((ingredients, i) =>
    makeRecipe({
      id: `collation_${i}`,
      name: `Collation ${i}`,
      ingredients,
      servings: 1,
      mealTypes: ['snack'],
      prepMin: 2,
      cookMin: 0,
      tags: ['quick', 'no_cook'],
      nutritionPerServing: { kcal: 150 + i * 20, protein: 4, carbs: 25, fat: 3, fiber: 2 },
    }),
  );
}

export const SYNTHETIC_RECIPES: readonly Recipe[] = [...mains(), ...breakfasts(), ...snacks()];

export const SYNTHETIC_DATASET: Dataset = {
  version: 'synthetic-1',
  ingredients: SYNTHETIC_INGREDIENTS,
  recipes: SYNTHETIC_RECIPES,
};
