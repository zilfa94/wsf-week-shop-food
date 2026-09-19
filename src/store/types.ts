/** Forme du store zustand (docs/SPEC.md § 5). Aucune logique métier ici : les actions appellent le core. */
import type { AppSettings, ISODate, IngredientId, ManualItem, PantryItem, RecipeId, UserProfile, WeekPlan } from '@/core/types';

export interface ProfileSlice {
  readonly profile: UserProfile;
  setProfile: (patch: Partial<UserProfile>) => void;
}

export interface PlanSlice {
  readonly currentPlan: WeekPlan | null;
  /** Plan d'avant le dernier swap, pour « Annuler » (non persisté). */
  readonly previousPlan: WeekPlan | null;
  readonly seed: number;
  /** Génère la semaine contenant `today` (ou `weekStart`), en conservant les repas verrouillés/cuisinés si demandé. */
  generatePlan: (args: { today: ISODate; weekStart?: ISODate; keepLocked?: boolean }) => void;
  /** Nouvelle seed, même semaine, repas verrouillés et cuisinés conservés. */
  regeneratePlan: (args: { today: ISODate }) => void;
  swapMeal: (mealId: string, recipeId: RecipeId, today: ISODate) => void;
  undoSwap: () => void;
  /** Abandonne la possibilité d'annuler le dernier swap (snackbar expirée). */
  dismissUndo: () => void;
  toggleLock: (mealId: string) => void;
  /** Marquer cuisiné décompte les ingrédients du garde-manger ; démarquer ne les restitue pas. */
  setCooked: (mealId: string, cooked: boolean) => void;
  setMealServings: (mealId: string, servings: number) => void;
  /** Semaine suivante : nouvelle seed, état coché de l'ancien plan purgé. */
  startNextWeek: (args: { today: ISODate }) => void;
  clearPlan: () => void;
}

export interface ShoppingSlice {
  /** `itemKey(planId, ingredientId)` → coché. */
  readonly checked: Readonly<Record<string, boolean>>;
  /** `itemKey(planId, ingredientId)` → index de conditionnement. */
  readonly packChoices: Readonly<Record<string, number>>;
  /** planId → articles libres. */
  readonly manualItems: Readonly<Record<string, readonly ManualItem[]>>;
  toggleChecked: (planId: string, ingredientId: IngredientId) => void;
  setPackChoice: (planId: string, ingredientId: IngredientId, index: number) => void;
  addManualItem: (planId: string, item: Omit<ManualItem, 'id' | 'checked'>) => void;
  toggleManualItem: (planId: string, id: string) => void;
  removeManualItem: (planId: string, id: string) => void;
  /** « J'en ai déjà » : ajoute la quantité au garde-manger (l'article disparaît de la liste par dérivation). */
  markHaveAlready: (ingredientId: IngredientId, quantity: number, today: ISODate) => void;
  /** Après les courses : les articles cochés entrent au garde-manger avec leur date limite. */
  commitPurchasesToPantry: (today: ISODate) => void;
}

export interface PantrySlice {
  readonly pantry: readonly PantryItem[];
  upsertPantryItem: (item: PantryItem) => void;
  removePantryItem: (ingredientId: IngredientId, addedAt?: ISODate) => void;
  purgeExpired: (today: ISODate) => void;
}

export interface SettingsSlice {
  readonly settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  completeOnboarding: () => void;
  /** Efface toutes les données (profil, plan, courses, garde-manger, réglages). */
  resetAll: () => void;
}

export type AppState = ProfileSlice & PlanSlice & ShoppingSlice & PantrySlice & SettingsSlice;

/** Ce qui est écrit dans AsyncStorage (`partialize`). Jamais la liste de courses ni `previousPlan`. */
export interface PersistedState {
  readonly profile: UserProfile;
  readonly currentPlan: WeekPlan | null;
  readonly seed: number;
  readonly checked: Readonly<Record<string, boolean>>;
  readonly packChoices: Readonly<Record<string, number>>;
  readonly manualItems: Readonly<Record<string, readonly ManualItem[]>>;
  readonly pantry: readonly PantryItem[];
  readonly settings: AppSettings;
}

export const DEFAULT_PROFILE: UserProfile = {
  persons: 2,
  diet: 'omnivore',
  allergens: [],
  dislikedIngredientIds: [],
  goal: 'balance',
  maxCookMinWeekday: 30,
  maxCookMinWeekend: 90,
  includeBreakfast: true,
  includeSnack: false,
  allowBatchCooking: true,
  assumeStaples: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  hasOnboarded: false,
  themeMode: 'system',
  hapticsEnabled: true,
  showCalories: true,
  weekStartDay: 0,
};
