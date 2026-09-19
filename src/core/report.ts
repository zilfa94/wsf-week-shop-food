/**
 * Bilan de fin de semaine : repas cuisinés, équilibre, gaspillage, restes orphelins, économie
 * réalisée grâce aux ingrédients partagés entre plats. Voir docs/SPEC.md § 4.7.
 */
import { indexIngredients, indexRecipes } from './dataset';
import { countDistinctVegetables, weekBalanceScore } from './nutrition';
import { roundToPackaging } from './packaging';
import type { Dataset, DayNutrition, ShoppingList, WeekPlan, WeekReport } from './types';

export interface WeekReportArgs {
  readonly plan: WeekPlan;
  readonly list: ShoppingList;
  readonly days: readonly DayNutrition[];
  readonly dataset: Dataset;
}

/**
 * Économie estimée : pour chaque article utilisé par plusieurs repas, différence entre les
 * conditionnements qu'il aurait fallu acheter repas par repas et ceux réellement achetés.
 */
export function sharedSavings(list: ShoppingList): number {
  let saved = 0;
  for (const item of list.items) {
    const meals = new Set(item.usedIn.map((u) => u.mealId));
    if (meals.size < 2) continue;
    const separate = item.usedIn.reduce((s, u) => s + roundToPackaging(item.packaging, u.quantity).packs, 0);
    const extra = separate - item.packs;
    if (extra > 0) saved += extra * item.packaging.price;
  }
  return Math.round(saved * 100) / 100;
}

export function weekReport(args: WeekReportArgs): WeekReport {
  const { plan, list, days, dataset } = args;
  const recipes = indexRecipes(dataset.recipes);
  const ingredients = indexIngredients(dataset.ingredients);
  return {
    cookedMeals: plan.meals.filter((m) => m.cooked).length,
    totalMeals: plan.meals.length,
    balanceScore: weekBalanceScore(days, countDistinctVegetables(plan, recipes, ingredients)),
    wasteScore: list.wasteScore,
    orphanLeftovers: list.leftovers
      .filter((l) => !l.reusedByMealId)
      .map((l) => ({ ingredientId: l.ingredientId, quantity: l.leftover })),
    savedEur: sharedSavings(list),
  };
}
