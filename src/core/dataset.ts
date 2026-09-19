/** Index en lecture seule du jeu de données (construits une fois, passés aux fonctions du core). */
import type { Ingredient, IngredientId, Recipe, RecipeId } from './types';

export type IngredientIndex = ReadonlyMap<IngredientId, Ingredient>;
export type RecipeIndex = ReadonlyMap<RecipeId, Recipe>;

export function indexIngredients(ingredients: readonly Ingredient[]): IngredientIndex {
  return new Map(ingredients.map((i) => [i.id, i]));
}

export function indexRecipes(recipes: readonly Recipe[]): RecipeIndex {
  return new Map(recipes.map((r) => [r.id, r]));
}
