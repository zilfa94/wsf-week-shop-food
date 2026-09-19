/**
 * Hooks dérivés : ils lisent des références immuables du store et calculent via le core dans `useMemo`.
 * `useToday` est la seule source d'horloge de l'application (le core reçoit `today` en paramètre).
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { addDays, seasonOf, toISO } from '@/core/date';
import { indexIngredients, indexRecipes } from '@/core/dataset';
import { cookWithPantry } from '@/core/leftovers';
import { computeTarget, weekNutrition } from '@/core/nutrition';
import { PANTRY_EXPIRY_WARNING_DAYS } from '@/core/params';
import { weekReport } from '@/core/report';
import { buildShoppingList } from '@/core/shopping';
import { suggestSwaps } from '@/core/swap';
import type {
  DayNutrition,
  ISODate,
  IngredientId,
  PantryItem,
  RecipeFeasibility,
  ShoppingList,
  SwapSuggestion,
  WeekReport,
  Weekday,
} from '@/core/types';
import { DATASET } from '@/data';
import { useAppStore } from './index';
import { selectChecked, selectManualItems, selectPackChoices, selectPantry, selectPlan, selectProfile } from './selectors';

const EMPTY_MANUAL: readonly never[] = [];
export const INGREDIENT_INDEX = indexIngredients(DATASET.ingredients);
export const RECIPE_INDEX = indexRecipes(DATASET.recipes);

/** Vrai une fois l'état restauré depuis AsyncStorage (gate du layout racine). */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

/** Date du jour (locale), rafraîchie quand l'application revient au premier plan. */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => toISO(new Date()));
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toISO(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}

export function useShoppingList(): ShoppingList | null {
  const plan = useAppStore(selectPlan);
  const profile = useAppStore(selectProfile);
  const pantry = useAppStore(selectPantry);
  const checked = useAppStore(selectChecked);
  const packChoices = useAppStore(selectPackChoices);
  const manualItems = useAppStore(selectManualItems);
  const manual = plan ? (manualItems[plan.id] ?? EMPTY_MANUAL) : EMPTY_MANUAL;
  return useMemo(
    () => (plan ? buildShoppingList({ plan, dataset: DATASET, profile, pantry, checked, packChoices, manualItems: manual }) : null),
    [plan, profile, pantry, checked, packChoices, manual],
  );
}

export function useWeekNutrition(): DayNutrition[] | null {
  const plan = useAppStore(selectPlan);
  const profile = useAppStore(selectProfile);
  return useMemo(() => (plan ? weekNutrition(plan, RECIPE_INDEX, computeTarget(profile)) : null), [plan, profile]);
}

export function useDayNutrition(day: Weekday): DayNutrition | null {
  const week = useWeekNutrition();
  return week?.[day] ?? null;
}

export function useSwapSuggestions(mealId: string, limit = 5): SwapSuggestion[] {
  const plan = useAppStore(selectPlan);
  const profile = useAppStore(selectProfile);
  const pantry = useAppStore(selectPantry);
  const checked = useAppStore(selectChecked);
  return useMemo(
    () => (plan ? suggestSwaps({ plan, mealId, dataset: DATASET, profile, pantry, checked, limit }) : []),
    [plan, mealId, profile, pantry, checked, limit],
  );
}

export function useCookWithPantry(today: ISODate): RecipeFeasibility[] {
  const profile = useAppStore(selectProfile);
  const pantry = useAppStore(selectPantry);
  return useMemo(() => cookWithPantry(DATASET, pantry, profile, undefined, today), [pantry, profile, today]);
}

/** Lignes du garde-manger périmées ou qui périment sous `PANTRY_EXPIRY_WARNING_DAYS` jours. */
export function usePantryAlerts(today: ISODate): PantryItem[] {
  const pantry = useAppStore(selectPantry);
  return useMemo(() => {
    const limit = addDays(today, PANTRY_EXPIRY_WARNING_DAYS);
    return pantry.filter((p) => p.expiresAt !== undefined && p.expiresAt <= limit);
  }, [pantry, today]);
}

export function useWeekReport(): WeekReport | null {
  const plan = useAppStore(selectPlan);
  const list = useShoppingList();
  const days = useWeekNutrition();
  return useMemo(() => (plan && list && days ? weekReport({ plan, list, days, dataset: DATASET }) : null), [plan, list, days]);
}

export type IngredientStatus = 'pantry' | 'toBuy' | 'staple' | 'none';

/** Statut de chaque ingrédient d'une recette du plan vis-à-vis de la liste et du garde-manger. */
export function useRecipeIngredientStatus(recipeId: string): Map<IngredientId, IngredientStatus> {
  const list = useShoppingList();
  return useMemo(() => {
    const out = new Map<IngredientId, IngredientStatus>();
    const recipe = RECIPE_INDEX.get(recipeId);
    if (!recipe) return out;
    for (const ri of recipe.ingredients) {
      const item = list?.items.find((i) => i.ingredientId === ri.ingredientId);
      if (list?.staplesToCheck.includes(ri.ingredientId)) out.set(ri.ingredientId, 'staple');
      else if (!item) out.set(ri.ingredientId, 'none');
      else if (item.packs > 0) out.set(ri.ingredientId, 'toBuy');
      else out.set(ri.ingredientId, 'pantry');
    }
    return out;
  }, [list, recipeId]);
}

/** Saison courante, pour les écrans qui filtrent des recettes. */
export function useSeason(today: ISODate) {
  return useMemo(() => seasonOf(today), [today]);
}
