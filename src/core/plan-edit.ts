/**
 * Éditions simples et pures d'un plan (sans recalcul de coût : la liste de courses est dérivée)
 * et détection des situations à signaler (semaine terminée, profil modifié). Voir docs/SPEC.md § 4.5.
 */
import { addDays } from './date';
import { indexIngredients } from './dataset';
import { isRecipeEligible } from './filter';
import type { Dataset, ISODate, Meal, UserProfile, WeekPlan } from './types';

export type ProfileDrift = 'persons' | 'diet' | 'allergens' | 'dislikes' | 'meals' | 'cuisines';

export function mealById(plan: WeekPlan, mealId: string): Meal | undefined {
  return plan.meals.find((m) => m.id === mealId);
}

function updateMeal(plan: WeekPlan, mealId: string, update: (meal: Meal) => Meal): WeekPlan {
  if (!plan.meals.some((m) => m.id === mealId)) return plan;
  return { ...plan, meals: plan.meals.map((m) => (m.id === mealId ? update(m) : m)) };
}

export function toggleLock(plan: WeekPlan, mealId: string): WeekPlan {
  return updateMeal(plan, mealId, (m) => ({ ...m, locked: !m.locked }));
}

export function setCooked(plan: WeekPlan, mealId: string, cooked: boolean): WeekPlan {
  return updateMeal(plan, mealId, (m) => ({ ...m, cooked }));
}

/** Portions à cuisiner (≥ 1). Sans effet sur un repas « restes » (toujours 0). */
export function setMealServings(plan: WeekPlan, mealId: string, servings: number): WeekPlan {
  const s = Math.max(1, Math.round(servings));
  return updateMeal(plan, mealId, (m) => (m.leftoverOf ? m : { ...m, servings: s }));
}

/** La semaine est terminée quand `today` dépasse son dernier jour. */
export function isPlanExpired(plan: WeekPlan, today: ISODate): boolean {
  return today > addDays(plan.weekStart, 6);
}

/** Différences entre le profil actuel et celui utilisé pour générer le plan. */
export function profileDrift(plan: WeekPlan, profile: UserProfile): ProfileDrift[] {
  const snap = plan.profileSnapshot;
  const out: ProfileDrift[] = [];
  if (snap.persons !== profile.persons) out.push('persons');
  if (snap.diet !== profile.diet) out.push('diet');
  if (!sameSet(snap.allergens, profile.allergens)) out.push('allergens');
  if (!sameSet(snap.dislikedIngredientIds, profile.dislikedIngredientIds)) out.push('dislikes');
  if (!sameSet(snap.preferredCuisines ?? [], profile.preferredCuisines ?? [])) out.push('cuisines');
  if (
    snap.includeBreakfast !== profile.includeBreakfast ||
    snap.includeLunch !== profile.includeLunch ||
    snap.includeDinner !== profile.includeDinner ||
    snap.includeSnack !== profile.includeSnack
  ) {
    out.push('meals');
  }
  return out;
}

/** Repas du plan devenus inéligibles avec le profil actuel (régime, allergènes, aversions ; le temps n'est pas revérifié). */
export function incompatibleMeals(plan: WeekPlan, profile: UserProfile, dataset: Dataset): Meal[] {
  const ingredients = indexIngredients(dataset.ingredients);
  const recipes = new Map(dataset.recipes.map((r) => [r.id, r]));
  return plan.meals.filter((m) => {
    const recipe = recipes.get(m.recipeId);
    return !recipe || !isRecipeEligible(recipe, profile, ingredients);
  });
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
