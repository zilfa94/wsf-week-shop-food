/**
 * Cibles nutritionnelles, macros journalières, scores. Les macros des recettes sont « par portion »
 * = par personne ; tout est donc calculé par personne. Voir docs/SPEC.md § 4.2.
 */
import type { IngredientIndex, RecipeIndex } from './dataset';
import { mealTypesFor, type MealFlags } from './filter';
import { NUTRITION_TOLERANCE, PLANNED_SHARE } from './params';
import type {
  Activity,
  BodyInfo,
  DayNutrition,
  Goal,
  Macros,
  MealType,
  NutritionTarget,
  UserProfile,
  WeekPlan,
  Weekday,
} from './types';

const ACTIVITY_FACTOR: Readonly<Record<Activity, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
};

const GOAL_FACTOR: Readonly<Record<Goal, number>> = {
  balance: 1,
  weight_loss: 0.85,
  muscle_gain: 1.1,
  budget: 1,
};

/** Cible calorique par défaut quand le profil n'a pas de données corporelles. */
const DEFAULT_KCAL: Readonly<Record<Goal, number>> = {
  balance: 2000,
  weight_loss: 1700,
  muscle_gain: 2400,
  budget: 2000,
};

/** Répartition protéines / glucides / lipides (part des kcal). */
const MACRO_SPLIT: Readonly<Record<Goal, { p: number; c: number; f: number }>> = {
  balance: { p: 0.2, c: 0.5, f: 0.3 },
  weight_loss: { p: 0.3, c: 0.4, f: 0.3 },
  muscle_gain: { p: 0.25, c: 0.5, f: 0.25 },
  budget: { p: 0.2, c: 0.55, f: 0.25 },
};

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Métabolisme de base (Mifflin-St Jeor), kcal/jour. */
export function bmrMifflinStJeor(body: BodyInfo): number {
  const base = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age;
  return body.sex === 'm' ? base + 5 : base - 161;
}

/** Poids de base d'un repas dans la journée (petit-déjeuner + déjeuner + dîner = 1). */
const BASE_MEAL_WEIGHT: Readonly<Record<MealType, number>> = { breakfast: 0.25, lunch: 0.4, dinner: 0.35, snack: 0.1 };

/** Parts de kcal par type de repas activé, normalisées pour sommer à 1. */
export function mealShares(profile: MealFlags): Record<MealType, number> {
  const active = mealTypesFor(profile);
  const total = active.reduce((s, t) => s + BASE_MEAL_WEIGHT[t], 0);
  const shares: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const t of active) shares[t] = Math.round((BASE_MEAL_WEIGHT[t] / total) * 1000) / 1000;
  return shares;
}

/** Part de la journée couverte par les repas activés (1 pour petit-déjeuner + déjeuner + dîner). */
export function mealCoverage(profile: MealFlags): number {
  return Math.min(1, mealTypesFor(profile).reduce((s, t) => s + BASE_MEAL_WEIGHT[t], 0));
}

export function computeTarget(profile: UserProfile): NutritionTarget {
  let kcal = profile.body
    ? bmrMifflinStJeor(profile.body) * ACTIVITY_FACTOR[profile.body.activity] * GOAL_FACTOR[profile.goal]
    : DEFAULT_KCAL[profile.goal];
  const floor = profile.body?.sex === 'f' ? 1200 : 1500;
  kcal = Math.max(floor, Math.round(kcal / 10) * 10);

  const split = MACRO_SPLIT[profile.goal];
  const shares = mealShares(profile);
  const perMeal: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  let allocated = 0;
  for (const type of MEAL_TYPES) {
    if (type === 'dinner') continue;
    perMeal[type] = Math.round(kcal * shares[type]);
    allocated += perMeal[type];
  }
  perMeal.dinner = kcal - allocated; // le dîner absorbe l'arrondi : la somme vaut exactement kcal

  const protein = Math.round((kcal * split.p) / 4);
  return {
    kcal,
    protein,
    plannedKcal: Math.round(kcal * PLANNED_SHARE * mealCoverage(profile)),
    plannedProtein: Math.round(protein * PLANNED_SHARE * mealCoverage(profile)),
    carbs: Math.round((kcal * split.c) / 4),
    fat: Math.round((kcal * split.f) / 9),
    perMeal,
  };
}

export function sumMacros(list: readonly Macros[]): Macros {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  for (const m of list) {
    kcal += m.kcal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
    fiber += m.fiber;
  }
  return { kcal, protein, carbs, fat, fiber };
}

/** Macros par jour et par personne (7 entrées). Les repas « restes de batch » comptent : ils sont mangés. */
export function dailyMacros(plan: WeekPlan, recipes: RecipeIndex): Macros[] {
  const days: Macros[][] = Array.from({ length: 7 }, () => []);
  for (const meal of plan.meals) {
    const recipe = recipes.get(meal.recipeId);
    if (recipe) days[meal.slot.day]!.push(recipe.nutritionPerServing);
  }
  return days.map(sumMacros);
}

/** Écart relatif hors bande de tolérance (0 dans la bande). */
function bandDeviation(value: number, target: number, tolerance: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.abs(value - target) / target - tolerance);
}

/** Pénalité continue utilisée par le planificateur (ordre de grandeur 0..7 pour une semaine). */
export function nutritionPenalty(daily: readonly Macros[], target: NutritionTarget): number {
  let penalty = 0;
  for (const d of daily) {
    penalty += bandDeviation(d.kcal, target.plannedKcal, NUTRITION_TOLERANCE.kcal) ** 2;
    penalty += 0.5 * bandDeviation(d.protein, target.plannedProtein, NUTRITION_TOLERANCE.protein) ** 2;
    penalty += 0.2 * Math.max(0, (20 - d.fiber) / 20) ** 2;
  }
  return penalty;
}

/** Score lisible 0..100 d'une journée par rapport à la part attendue des repas planifiés. */
export function dayScore(m: Macros, target: NutritionTarget): number {
  const kcalDev = Math.abs(m.kcal - target.plannedKcal) / target.plannedKcal;
  const proteinDev = Math.max(0, (target.plannedProtein - m.protein) / target.plannedProtein); // seul le déficit pénalise
  const fatRatio = (m.fat * 9) / Math.max(1, m.kcal);
  const fatDev = Math.max(0, fatRatio - 0.4); // > 40 % des kcal en lipides
  const fiberDev = Math.max(0, (25 - m.fiber) / 25);
  const penalty =
    60 * Math.min(1, kcalDev / 0.3) + 20 * Math.min(1, proteinDev / 0.3) + 10 * Math.min(1, fatDev / 0.2) + 10 * fiberDev;
  return Math.round(Math.max(0, 100 - penalty));
}

export function weekNutrition(plan: WeekPlan, recipes: RecipeIndex, target: NutritionTarget): DayNutrition[] {
  return dailyMacros(plan, recipes).map((macros, day) => ({
    day: day as Weekday,
    macros,
    score: dayScore(macros, target),
  }));
}

/** Nombre de fruits & légumes distincts consommés sur la semaine (bonus de diversité). */
export function countDistinctVegetables(plan: WeekPlan, recipes: RecipeIndex, ingredients: IngredientIndex): number {
  const seen = new Set<string>();
  for (const meal of plan.meals) {
    const recipe = recipes.get(meal.recipeId);
    if (!recipe) continue;
    for (const ri of recipe.ingredients) {
      if (ingredients.get(ri.ingredientId)?.aisle === 'fruits_vegetables') seen.add(ri.ingredientId);
    }
  }
  return seen.size;
}

/** Score hebdomadaire 0..100 : moyenne des jours + bonus de diversité végétale (≤ 5). */
export function weekBalanceScore(days: readonly DayNutrition[], distinctVegetables: number): number {
  if (days.length === 0) return 0;
  const mean = days.reduce((s, d) => s + d.score, 0) / days.length;
  const bonus = Math.min(5, Math.max(0, distinctVegetables - 8));
  return Math.min(100, Math.round(mean + bonus));
}
