/**
 * Besoins en ingrédients d'une recette pour un nombre de portions, en unité canonique.
 * Partagé par le planificateur (coût de gaspillage) et la liste de courses (agrégation).
 */
import type { IngredientIndex } from './dataset';
import { isIngredientForbidden } from './filter';
import type { IngredientId, Recipe, UserProfile } from './types';
import { toCanonical } from './units';

/**
 * Quantités canoniques pour `servings` portions (mise à l'échelle `servings / recipe.servings`).
 * Un ingrédient optionnel interdit par le profil (allergie, régime, aversion) est retiré ;
 * un ingrédient inconnu est ignoré (le test d'intégrité des données l'empêche en amont).
 */
export function recipeNeeds(
  recipe: Recipe,
  servings: number,
  ingredients: IngredientIndex,
  profile: UserProfile,
): Map<IngredientId, number> {
  const scale = recipe.servings > 0 ? servings / recipe.servings : 0;
  const needs = new Map<IngredientId, number>();
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) continue;
    if (ri.optional && isIngredientForbidden(ing, profile)) continue;
    const q = toCanonical(ing, ri.quantity, ri.unit) * scale;
    needs.set(ing.id, (needs.get(ing.id) ?? 0) + q);
  }
  return needs;
}
