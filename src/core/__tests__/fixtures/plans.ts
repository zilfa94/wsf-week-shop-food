/** Plans synthétiques pour les tests du core. */
import { slotKey } from '../../filter';
import type { Meal, MealType, UserProfile, WeekPlan, Weekday } from '../../types';
import { OMNIVORE_2 } from './recipes';

export function makeMeal(day: Weekday, type: MealType, recipeId: string, extra: Partial<Meal> = {}): Meal {
  const slot = { day, type };
  return { id: slotKey(slot), slot, recipeId, servings: 2, locked: false, cooked: false, ...extra };
}

export function makePlan(meals: readonly Meal[], profile: UserProfile = OMNIVORE_2, extra: Partial<WeekPlan> = {}): WeekPlan {
  return {
    id: '2026-09-14-1',
    weekStart: '2026-09-14',
    seed: 1,
    datasetVersion: 'test',
    profileSnapshot: profile,
    meals,
    unfilled: [],
    cost: { total: 0, waste: 0, variety: 0, nutrition: 0, budget: 0 },
    ...extra,
  };
}
