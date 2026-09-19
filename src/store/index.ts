/**
 * Store zustand unique, persisté dans AsyncStorage (docs/SPEC.md § 5). La liste de courses n'est
 * jamais stockée : elle est dérivée par `useShoppingList` (hooks.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addDays, weekStartFor } from '@/core/date';
import { indexIngredients, indexRecipes } from '@/core/dataset';
import { recipeNeeds } from '@/core/needs';
import { applySwap } from '@/core/swap';
import { generateWeekPlan } from '@/core/planner';
import { mealById, setCooked as setCookedPure, setMealServings as setServingsPure, toggleLock as toggleLockPure } from '@/core/plan-edit';
import { addPurchasesToPantry, buildShoppingList, consumeFromPantry, itemKey } from '@/core/shopping';
import type { ISODate, ManualItem, PantryItem } from '@/core/types';
import { DATASET } from '@/data';
import { migratePersisted, sanitizePersisted, STORE_VERSION } from './migrations';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, type AppState, type PersistedState } from './types';

export const STORE_KEY = 'wsf-store';

const INGREDIENTS = indexIngredients(DATASET.ingredients);
const RECIPES = indexRecipes(DATASET.recipes);

type Slice<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;

/** Ne garde que les entrées d'un `Record` dont la clé commence par `${planId}:`. */
function pruneByPlan<T>(record: Readonly<Record<string, T>>, planId: string | null): Record<string, T> {
  if (!planId) return {};
  const prefix = `${planId}:`;
  return Object.fromEntries(Object.entries(record).filter(([k]) => k.startsWith(prefix)));
}

const createProfileSlice: Slice<Pick<AppState, 'profile' | 'setProfile'>> = (set) => ({
  profile: DEFAULT_PROFILE,
  setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
});

const createPlanSlice: Slice<
  Pick<
    AppState,
    | 'currentPlan'
    | 'previousPlan'
    | 'seed'
    | 'generatePlan'
    | 'regeneratePlan'
    | 'swapMeal'
    | 'undoSwap'
    | 'dismissUndo'
    | 'toggleLock'
    | 'setCooked'
    | 'setMealServings'
    | 'startNextWeek'
    | 'clearPlan'
  >
> = (set, get) => {
  const generate = (weekStart: ISODate, today: ISODate, seed: number, keepLocked: boolean) => {
    const s = get();
    const keep =
      keepLocked && s.currentPlan && s.currentPlan.weekStart === weekStart
        ? s.currentPlan.meals.filter((m) => m.locked || m.cooked)
        : [];
    const plan = generateWeekPlan({ dataset: DATASET, profile: s.profile, pantry: s.pantry, weekStart, today, seed, keep });
    set({
      currentPlan: plan,
      previousPlan: null,
      seed,
      checked: pruneByPlan(s.checked, plan.id),
      packChoices: pruneByPlan(s.packChoices, plan.id),
      manualItems: s.manualItems[plan.id] ? { [plan.id]: s.manualItems[plan.id]! } : {},
    });
  };
  return {
    currentPlan: null,
    previousPlan: null,
    seed: 1,
    generatePlan: ({ today, weekStart, keepLocked = true }) => {
      const s = get();
      generate(weekStart ?? weekStartFor(today, s.settings.weekStartDay), today, s.seed, keepLocked);
    },
    regeneratePlan: ({ today }) => {
      const s = get();
      const weekStart = s.currentPlan?.weekStart ?? weekStartFor(today, s.settings.weekStartDay);
      generate(weekStart, today, s.seed + 1, true);
    },
    swapMeal: (mealId, recipeId, today) => {
      const s = get();
      if (!s.currentPlan) return;
      const next = applySwap(s.currentPlan, mealId, recipeId, DATASET, s.profile, s.pantry, today);
      set({ previousPlan: s.currentPlan, currentPlan: next });
    },
    undoSwap: () => {
      const s = get();
      if (s.previousPlan) set({ currentPlan: s.previousPlan, previousPlan: null });
    },
    dismissUndo: () => set({ previousPlan: null }),
    toggleLock: (mealId) => set((s) => (s.currentPlan ? { currentPlan: toggleLockPure(s.currentPlan, mealId) } : {})),
    setCooked: (mealId, cooked) => {
      const s = get();
      if (!s.currentPlan) return;
      const meal = mealById(s.currentPlan, mealId);
      const recipe = meal ? RECIPES.get(meal.recipeId) : undefined;
      const plan = setCookedPure(s.currentPlan, mealId, cooked);
      if (cooked && meal && recipe && !meal.cooked && meal.servings > 0) {
        const needs = recipeNeeds(recipe, meal.servings, INGREDIENTS, s.profile);
        set({ currentPlan: plan, pantry: consumeFromPantry(s.pantry, needs) });
      } else {
        set({ currentPlan: plan });
      }
    },
    setMealServings: (mealId, servings) =>
      set((s) => (s.currentPlan ? { currentPlan: setServingsPure(s.currentPlan, mealId, servings) } : {})),
    startNextWeek: ({ today }) => {
      const s = get();
      const base = s.currentPlan ? addDays(s.currentPlan.weekStart, 7) : weekStartFor(today, s.settings.weekStartDay);
      const weekStart = base < today ? weekStartFor(today, s.settings.weekStartDay) : base;
      generate(weekStart, today, s.seed + 1, false);
    },
    clearPlan: () => set({ currentPlan: null, previousPlan: null, checked: {}, packChoices: {}, manualItems: {} }),
  };
};

const createShoppingSlice: Slice<
  Pick<
    AppState,
    | 'checked'
    | 'packChoices'
    | 'manualItems'
    | 'toggleChecked'
    | 'setPackChoice'
    | 'addManualItem'
    | 'toggleManualItem'
    | 'removeManualItem'
    | 'markHaveAlready'
    | 'commitPurchasesToPantry'
  >
> = (set, get) => ({
  checked: {},
  packChoices: {},
  manualItems: {},
  toggleChecked: (planId, ingredientId) =>
    set((s) => {
      const key = itemKey(planId, ingredientId);
      return { checked: { ...s.checked, [key]: !s.checked[key] } };
    }),
  setPackChoice: (planId, ingredientId, index) =>
    set((s) => ({ packChoices: { ...s.packChoices, [itemKey(planId, ingredientId)]: Math.max(0, Math.floor(index)) } })),
  addManualItem: (planId, item) =>
    set((s) => {
      const list = s.manualItems[planId] ?? [];
      const id = `m${list.reduce((max, m) => Math.max(max, Number(m.id.slice(1)) || 0), 0) + 1}`;
      const manual: ManualItem = { ...item, id, checked: false };
      return { manualItems: { ...s.manualItems, [planId]: [...list, manual] } };
    }),
  toggleManualItem: (planId, id) =>
    set((s) => ({
      manualItems: {
        ...s.manualItems,
        [planId]: (s.manualItems[planId] ?? []).map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
      },
    })),
  removeManualItem: (planId, id) =>
    set((s) => ({ manualItems: { ...s.manualItems, [planId]: (s.manualItems[planId] ?? []).filter((m) => m.id !== id) } })),
  markHaveAlready: (ingredientId, quantity, today) =>
    set((s) => ({ pantry: [...s.pantry, { ingredientId, quantity, addedAt: today }] })),
  commitPurchasesToPantry: (today) => {
    const s = get();
    if (!s.currentPlan) return;
    const list = buildShoppingList({
      plan: s.currentPlan,
      dataset: DATASET,
      profile: s.profile,
      pantry: s.pantry,
      checked: s.checked,
      packChoices: s.packChoices,
      manualItems: s.manualItems[s.currentPlan.id] ?? [],
    });
    set({ pantry: addPurchasesToPantry(s.pantry, list, today, DATASET.ingredients) });
  },
});

const createPantrySlice: Slice<Pick<AppState, 'pantry' | 'upsertPantryItem' | 'removePantryItem' | 'purgeExpired'>> = (set) => ({
  pantry: [],
  upsertPantryItem: (item) =>
    set((s) => {
      const i = s.pantry.findIndex((p) => p.ingredientId === item.ingredientId && p.addedAt === item.addedAt);
      const pantry: PantryItem[] = [...s.pantry];
      if (i === -1) pantry.push(item);
      else pantry[i] = item;
      return { pantry };
    }),
  removePantryItem: (ingredientId, addedAt) =>
    set((s) => ({ pantry: s.pantry.filter((p) => !(p.ingredientId === ingredientId && (addedAt === undefined || p.addedAt === addedAt))) })),
  purgeExpired: (today) => set((s) => ({ pantry: s.pantry.filter((p) => !p.expiresAt || p.expiresAt >= today) })),
});

const createSettingsSlice: Slice<Pick<AppState, 'settings' | 'setSetting' | 'completeOnboarding' | 'resetAll'>> = (set) => ({
  settings: DEFAULT_SETTINGS,
  setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
  completeOnboarding: () => set((s) => ({ settings: { ...s.settings, hasOnboarded: true } })),
  resetAll: () =>
    set({
      profile: DEFAULT_PROFILE,
      currentPlan: null,
      previousPlan: null,
      seed: 1,
      checked: {},
      packChoices: {},
      manualItems: {},
      pantry: [],
      settings: DEFAULT_SETTINGS,
    }),
});

export function partialize(s: AppState): PersistedState {
  return {
    profile: s.profile,
    currentPlan: s.currentPlan,
    seed: s.seed,
    checked: s.checked,
    packChoices: s.packChoices,
    manualItems: s.manualItems,
    pantry: s.pantry,
    settings: s.settings,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createProfileSlice(...a),
      ...createPlanSlice(...a),
      ...createShoppingSlice(...a),
      ...createPantrySlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize,
      migrate: (persisted, version) => migratePersisted(persisted, version) as unknown as AppState,
      // l'assainissement s'applique aussi sans migration : le jeu de données peut avoir changé
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
    },
  ),
);

// Aide au débogage en développement : `__wsfStore.getState()` dans la console.
if (__DEV__) (globalThis as { __wsfStore?: typeof useAppStore }).__wsfStore = useAppStore;
