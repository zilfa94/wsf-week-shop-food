/**
 * Restes prévisibles et leur réutilisation ; faisabilité d'une recette avec le garde-manger
 * (« Cuisiner avec ce que j'ai »). Voir docs/SPEC.md § 4.6.
 */
import type { IngredientIndex } from './dataset';
import { indexIngredients } from './dataset';
import { isRecipeEligible } from './filter';
import { recipeNeeds } from './needs';
import { EPS, perishFactor, roundToPackaging, unitPrice } from './packaging';
import { FEASIBILITY_MIN_RATIO, LEFTOVER_MIN_RATIO, LEFTOVER_MIN_VALUE } from './params';
import type {
  Dataset,
  ISODate,
  IngredientId,
  LeftoverSuggestion,
  PantryItem,
  Recipe,
  RecipeFeasibility,
  ShoppingItem,
  UserProfile,
  WeekPlan,
} from './types';

/** Quantités du garde-manger par ingrédient (lignes périmées à `today` exclues si `today` est fourni). */
export function pantryQuantities(pantry: readonly PantryItem[], today?: ISODate): Map<IngredientId, number> {
  const out = new Map<IngredientId, number>();
  for (const p of pantry) {
    if (today && p.expiresAt && p.expiresAt < today) continue;
    out.set(p.ingredientId, (out.get(p.ingredientId) ?? 0) + p.quantity);
  }
  return out;
}

/** Un reste vaut la peine d'être signalé s'il a de la valeur ou représente une part notable du pack. */
export function isNotableLeftover(item: ShoppingItem, staple: boolean): boolean {
  if (staple || item.leftover <= EPS) return false;
  return item.leftoverValue >= LEFTOVER_MIN_VALUE || item.leftover / item.packaging.size >= LEFTOVER_MIN_RATIO;
}

export interface LeftoverArgs {
  readonly items: readonly ShoppingItem[];
  readonly plan: WeekPlan;
  readonly dataset: Dataset;
  readonly profile: UserProfile;
  readonly pantry: readonly PantryItem[];
  readonly maxRecipesPerItem?: number;
}

export function suggestLeftoverUses(args: LeftoverArgs): LeftoverSuggestion[] {
  const { items, plan, dataset, profile, pantry } = args;
  const max = args.maxRecipesPerItem ?? 3;
  const ingredients = indexIngredients(dataset.ingredients);
  const pantryQty = pantryQuantities(pantry, plan.weekStart);

  const leftovers = new Map<IngredientId, ShoppingItem>();
  for (const item of items) {
    const ing = ingredients.get(item.ingredientId);
    if (ing && isNotableLeftover(item, ing.staple)) leftovers.set(item.ingredientId, item);
  }
  if (leftovers.size === 0) return [];

  const inPlan = new Set(plan.meals.map((m) => m.recipeId));
  const candidates = dataset.recipes.filter((r) => !inPlan.has(r.id) && isRecipeEligible(r, profile, ingredients));
  const needsOf = new Map(candidates.map((r) => [r.id, recipeNeeds(r, profile.persons, ingredients, profile)] as const));

  const out: LeftoverSuggestion[] = [];
  for (const [ingId, item] of leftovers) {
    const ing = ingredients.get(ingId)!;
    const recipes: { recipeId: string; coversValue: number; extraCost: number; score: number }[] = [];
    for (const r of candidates) {
      const needs = needsOf.get(r.id)!;
      if (!needs.has(ingId)) continue;
      let coversValue = 0;
      let extraCost = 0;
      for (const [nId, nQty] of needs) {
        const nIng = ingredients.get(nId)!;
        if (nIng.staple && profile.assumeStaples) continue;
        const have = (leftovers.get(nId)?.leftover ?? 0) + (pantryQty.get(nId) ?? 0);
        const used = Math.min(have, nQty);
        coversValue += used * unitPrice(nIng.packaging) * perishFactor(nIng);
        if (nQty - used > EPS) extraCost += roundToPackaging(nIng.packaging, nQty - used).packs * nIng.packaging.price;
      }
      recipes.push({ recipeId: r.id, coversValue, extraCost, score: coversValue - 0.5 * extraCost });
    }
    recipes.sort((a, b) => b.score - a.score || a.recipeId.localeCompare(b.recipeId));

    // un reste « réutilisé » = un pack partagé par un repas ultérieur au premier usage
    const laterUses = item.usedIn
      .filter((u) => {
        const meal = plan.meals.find((m) => m.id === u.mealId);
        return meal !== undefined && meal.slot.day > item.firstUseDay;
      })
      .sort((a, b) => a.mealId.localeCompare(b.mealId));
    const reusedBy = laterUses.length > 0 ? laterUses[laterUses.length - 1]!.mealId : undefined;

    out.push({
      ingredientId: ingId,
      leftover: item.leftover,
      leftoverValue: item.leftoverValue,
      ...(reusedBy ? { reusedByMealId: reusedBy } : {}),
      recipes: recipes.slice(0, max),
      hints: ing.leftoverHints ?? [],
      freezable: ing.freezable,
    });
  }
  return out.sort((a, b) => b.leftoverValue - a.leftoverValue || a.ingredientId.localeCompare(b.ingredientId));
}

/** Part (en valeur) des ingrédients d'une recette disponible dans le garde-manger, et les manquants. */
export function recipeFeasibility(
  recipe: Recipe,
  pantry: readonly PantryItem[],
  ingredients: IngredientIndex,
  profile: UserProfile,
  persons: number,
  today?: ISODate,
): RecipeFeasibility {
  const needs = recipeNeeds(recipe, persons, ingredients, profile);
  const have = pantryQuantities(pantry, today);
  let totalValue = 0;
  let coveredValue = 0;
  const missing: { ingredientId: IngredientId; quantity: number }[] = [];
  for (const [id, qty] of needs) {
    const ing = ingredients.get(id)!;
    if (ing.staple && profile.assumeStaples) continue;
    const value = qty * unitPrice(ing.packaging);
    const available = Math.min(have.get(id) ?? 0, qty);
    totalValue += value;
    coveredValue += available * unitPrice(ing.packaging);
    if (qty - available > EPS) missing.push({ ingredientId: id, quantity: qty - available });
  }
  return { recipeId: recipe.id, ratio: totalValue > 0 ? coveredValue / totalValue : 1, missing };
}

/** Recettes faisables (≥ `minRatio` de leur valeur en stock), les plus faisables d'abord. */
export function cookWithPantry(
  dataset: Dataset,
  pantry: readonly PantryItem[],
  profile: UserProfile,
  minRatio = FEASIBILITY_MIN_RATIO,
  today?: ISODate,
): RecipeFeasibility[] {
  const ingredients = indexIngredients(dataset.ingredients);
  return dataset.recipes
    .filter((r) => isRecipeEligible(r, profile, ingredients))
    .map((r) => recipeFeasibility(r, pantry, ingredients, profile, profile.persons, today))
    .filter((f) => f.ratio >= minRatio)
    .sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length || a.recipeId.localeCompare(b.recipeId));
}
