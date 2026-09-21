/**
 * Planificateur 7 jours : glouton puis recuit simulé sur un coût
 * `gaspillage pondéré par la périssabilité + variété + nutrition + budget`.
 * Déterministe (PRNG seedé, nombre d'itérations fixe). Voir docs/SPEC.md § 4.3 et
 * docs/conception/proposition-algo.md § 2.
 *
 * Les structures `PlanContext` / `PlanState` sont internes (Map/Set) ; seul `WeekPlan` sort du module.
 */
import { isOutsidePreferences, profileFamilies } from './cuisines';
import { seasonOf } from './date';
import type { IngredientIndex, RecipeIndex } from './dataset';
import { indexIngredients, indexRecipes } from './dataset';
import { candidatesForSlot, slotKey, slotsForProfile } from './filter';
import { recipeNeeds } from './needs';
import { computeTarget, nutritionPenalty, sumMacros, ZERO_MACROS } from './nutrition';
import { EPS, perishFactor, roundToPackaging, unitPrice } from './packaging';
import { BUDGET_GOAL_WEIGHT, resolvePlannerParams } from './params';
import { mulberry32, randomInt, type Rng } from './rng';
import type {
  CostBreakdown,
  Cuisine,
  GenerateInput,
  Ingredient,
  IngredientId,
  Macros,
  Meal,
  MealSlot,
  MealType,
  NutritionTarget,
  PantryItem,
  PlannerParams,
  Recipe,
  RecipeId,
  Season,
  UserProfile,
  WeekPlan,
} from './types';

// ---------------------------------------------------------------------------
// Contexte (immuable pendant la recherche) et état (muté par les mouvements)
// ---------------------------------------------------------------------------

export interface PlanContext {
  readonly recipes: RecipeIndex;
  readonly ingredients: IngredientIndex;
  readonly profile: UserProfile;
  /** Quantité de garde-manger utilisable par ingrédient (non périmée au début de semaine). */
  readonly pantry: ReadonlyMap<IngredientId, number>;
  readonly target: NutritionTarget;
  /** Besoins canoniques d'une recette pour `profile.persons` portions (staples retirés si `assumeStaples`). */
  readonly needsOf: ReadonlyMap<RecipeId, ReadonlyMap<IngredientId, number>>;
  readonly macrosOf: ReadonlyMap<RecipeId, Macros>;
  /** Candidats par clé de créneau. */
  readonly candidates: ReadonlyMap<string, readonly RecipeId[]>;
  readonly slots: readonly MealSlot[];
  readonly params: PlannerParams;
  readonly season: Season;
  /** `BUDGET_GOAL_WEIGHT` si l'objectif est `budget`, sinon 0. */
  readonly budgetWeight: number;
  /** Familles de cuisines préférées (vide = pas de préférence), voir `cuisines.ts`. */
  readonly preferredFamilies: ReadonlySet<Cuisine>;
}

export interface PlanState {
  /** clé de créneau → recette (null = vide). */
  readonly assign: Map<string, RecipeId | null>;
  /** Nombre de créneaux utilisant chaque recette (les petits-déjeuners/collations peuvent se répéter). */
  readonly useCount: Map<RecipeId, number>;
  /** Facteur de portions par créneau (1 = `persons`), pour les repas conservés avec portions personnalisées. */
  readonly factor: Map<string, number>;
  /** Créneaux conservés (verrouillés / cuisinés) : jamais déplacés. */
  readonly fixed: Set<string>;
  /** Créneaux déjà cuisinés : jamais doublés par un batch. */
  readonly cooked: Set<string>;
  /** clé de déjeuner « restes » → clé du dîner source (batch cooking). */
  readonly batchOf: Map<string, string>;
  readonly needs: Map<IngredientId, number>;
  readonly ingWaste: Map<IngredientId, number>;
  readonly ingPrice: Map<IngredientId, number>;
  waste: number;
  price: number;
}

const TYPE_ORDER: Readonly<Record<MealType, number>> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
/** Types pour lesquels une même recette ne peut pas apparaître deux fois dans la semaine. */
const UNIQUE_TYPES: ReadonlySet<MealType> = new Set<MealType>(['lunch', 'dinner']);

function slotOf(key: string): MealSlot {
  const [d, t] = key.split('-');
  return { day: Number(d) as MealSlot['day'], type: t as MealType };
}

/** Garde-manger utilisable : lignes non périmées à `weekStart`, sommées par ingrédient. */
export function usablePantry(pantry: readonly PantryItem[], weekStart: string): Map<IngredientId, number> {
  const out = new Map<IngredientId, number>();
  for (const p of pantry) {
    if (p.expiresAt && p.expiresAt < weekStart) continue;
    out.set(p.ingredientId, (out.get(p.ingredientId) ?? 0) + p.quantity);
  }
  return out;
}

export function buildPlanContext(input: GenerateInput): PlanContext {
  const recipes = indexRecipes(input.dataset.recipes);
  const ingredients = indexIngredients(input.dataset.ingredients);
  const { profile } = input;
  const params = resolvePlannerParams(input.params);
  const season = seasonOf(input.weekStart);
  const slots = slotsForProfile(profile);

  const needsOf = new Map<RecipeId, ReadonlyMap<IngredientId, number>>();
  const macrosOf = new Map<RecipeId, Macros>();
  for (const r of input.dataset.recipes) {
    const needs = recipeNeeds(r, profile.persons, ingredients, profile);
    if (profile.assumeStaples) {
      for (const id of [...needs.keys()]) if (ingredients.get(id)?.staple) needs.delete(id);
    }
    needsOf.set(r.id, needs);
    macrosOf.set(r.id, r.nutritionPerServing);
  }

  const candidates = new Map<string, readonly RecipeId[]>();
  for (const slot of slots) {
    candidates.set(
      slotKey(slot),
      candidatesForSlot(input.dataset.recipes, slot, profile, ingredients, season).map((r) => r.id),
    );
  }

  return {
    recipes,
    ingredients,
    profile,
    pantry: usablePantry(input.pantry, input.weekStart),
    target: computeTarget(profile),
    needsOf,
    macrosOf,
    candidates,
    slots,
    params,
    season,
    budgetWeight: profile.goal === 'budget' ? BUDGET_GOAL_WEIGHT : 0,
    preferredFamilies: profileFamilies(profile),
  };
}

export function emptyState(slots: readonly MealSlot[]): PlanState {
  const assign = new Map<string, RecipeId | null>();
  for (const s of slots) assign.set(slotKey(s), null);
  return {
    assign,
    useCount: new Map(),
    factor: new Map(),
    fixed: new Set(),
    cooked: new Set(),
    batchOf: new Map(),
    needs: new Map(),
    ingWaste: new Map(),
    ingPrice: new Map(),
    waste: 0,
    price: 0,
  };
}

export function cloneState(st: PlanState): PlanState {
  return {
    assign: new Map(st.assign),
    useCount: new Map(st.useCount),
    factor: new Map(st.factor),
    fixed: new Set(st.fixed),
    cooked: new Set(st.cooked),
    batchOf: new Map(st.batchOf),
    needs: new Map(st.needs),
    ingWaste: new Map(st.ingWaste),
    ingPrice: new Map(st.ingPrice),
    waste: st.waste,
    price: st.price,
  };
}

// ---------------------------------------------------------------------------
// Coût de gaspillage incrémental
// ---------------------------------------------------------------------------

/** Coût d'un ingrédient pour un besoin donné : valeur « à risque » du reste + prix (pondéré ensuite). */
export function ingredientCost(ing: Ingredient, need: number, pantry: number): { waste: number; price: number } {
  const toBuy = Math.max(0, need - pantry);
  if (toBuy <= EPS) return { waste: 0, price: 0 };
  const { packs, bought } = roundToPackaging(ing.packaging, toBuy);
  const leftover = Math.max(0, bought - toBuy);
  return { waste: leftover * unitPrice(ing.packaging) * perishFactor(ing), price: packs * ing.packaging.price };
}

/** Variation de (waste, price) si l'on ajoute `factor` fois les besoins de `recipeId` (négatif pour retirer). Ne modifie rien. */
export function wasteDelta(st: PlanState, ctx: PlanContext, recipeId: RecipeId, factor: number): { waste: number; price: number } {
  let waste = 0;
  let price = 0;
  const needs = ctx.needsOf.get(recipeId);
  if (!needs) return { waste, price };
  for (const [ingId, q] of needs) {
    const ing = ctx.ingredients.get(ingId)!;
    const after = Math.max(0, (st.needs.get(ingId) ?? 0) + factor * q);
    const c = ingredientCost(ing, after, ctx.pantry.get(ingId) ?? 0);
    waste += c.waste - (st.ingWaste.get(ingId) ?? 0);
    price += c.price - (st.ingPrice.get(ingId) ?? 0);
  }
  return { waste, price };
}

function updateNeeds(st: PlanState, ctx: PlanContext, recipeId: RecipeId, factor: number): void {
  const needs = ctx.needsOf.get(recipeId);
  if (!needs) return;
  for (const [ingId, q] of needs) {
    const ing = ctx.ingredients.get(ingId)!;
    const after = Math.max(0, (st.needs.get(ingId) ?? 0) + factor * q);
    const c = ingredientCost(ing, after, ctx.pantry.get(ingId) ?? 0);
    st.waste += c.waste - (st.ingWaste.get(ingId) ?? 0);
    st.price += c.price - (st.ingPrice.get(ingId) ?? 0);
    st.needs.set(ingId, after);
    st.ingWaste.set(ingId, c.waste);
    st.ingPrice.set(ingId, c.price);
  }
}

/** Affecte (ou vide) un créneau et met à jour besoins et coûts. `factor` = portions relatives à `persons`. */
export function applyAssign(st: PlanState, ctx: PlanContext, key: string, recipeId: RecipeId | null, factor = 1): void {
  const prev = st.assign.get(key) ?? null;
  if (prev) {
    updateNeeds(st, ctx, prev, -(st.factor.get(key) ?? 1));
    const n = (st.useCount.get(prev) ?? 1) - 1;
    if (n <= 0) st.useCount.delete(prev);
    else st.useCount.set(prev, n);
    st.factor.delete(key);
  }
  if (recipeId) {
    updateNeeds(st, ctx, recipeId, factor);
    st.useCount.set(recipeId, (st.useCount.get(recipeId) ?? 0) + 1);
    st.factor.set(key, factor);
  }
  st.assign.set(key, recipeId);
}

// ---------------------------------------------------------------------------
// Variété et nutrition (recalcul complet : ≤ 28 créneaux)
// ---------------------------------------------------------------------------

function matrix(st: PlanState, ctx: PlanContext): Record<MealType, (Recipe | undefined)[]> {
  const m: Record<MealType, (Recipe | undefined)[]> = {
    breakfast: Array(7).fill(undefined),
    lunch: Array(7).fill(undefined),
    dinner: Array(7).fill(undefined),
    snack: Array(7).fill(undefined),
  };
  for (const [key, id] of st.assign) {
    if (!id) continue;
    const slot = slotOf(key);
    m[slot.type][slot.day] = ctx.recipes.get(id);
  }
  return m;
}

export function varietyPenalty(st: PlanState, ctx: PlanContext): number {
  const m = matrix(st, ctx);
  let p = 0;
  for (const type of ['lunch', 'dinner'] as const) {
    for (let d = 1; d < 7; d++) {
      const a = m[type][d - 1];
      const b = m[type][d];
      if (!a || !b) continue;
      if (a.mainProtein !== 'none' && a.mainProtein === b.mainProtein) p += 1;
      if (a.baseCarb !== 'none' && a.baseCarb === b.baseCarb) p += 0.6;
      if (a.cuisine === b.cuisine) p += 0.4;
    }
  }
  for (let d = 0; d < 7; d++) {
    const a = m.lunch[d];
    const b = m.dinner[d];
    if (a && b && a.mainProtein !== 'none' && a.mainProtein === b.mainProtein) p += 0.8;
  }
  const mains = [...m.lunch, ...m.dinner].filter((r): r is Recipe => !!r);
  const proteinCount = new Map<string, number>();
  const cuisineCount = new Map<string, number>();
  for (const r of mains) {
    if (r.mainProtein !== 'none') proteinCount.set(r.mainProtein, (proteinCount.get(r.mainProtein) ?? 0) + 1);
    cuisineCount.set(r.cuisine, (cuisineCount.get(r.cuisine) ?? 0) + 1);
  }
  for (const n of proteinCount.values()) if (n > 3) p += (n - 3) * 1.2;
  for (const n of cuisineCount.values()) if (n > 4) p += (n - 4) * 0.8;
  // cuisines préférées : un déjeuner / dîner hors préférences n'apparaît que faute de mieux
  if (ctx.preferredFamilies.size > 0) {
    for (const r of mains) if (isOutsidePreferences(r, ctx.preferredFamilies)) p += ctx.params.cuisinePenalty;
  }
  // petits-déjeuners et collations : répétitions tolérées mais pénalisées
  for (const type of ['breakfast', 'snack'] as const) {
    const count = new Map<string, number>();
    for (let d = 0; d < 7; d++) {
      const r = m[type][d];
      if (!r) continue;
      count.set(r.id, (count.get(r.id) ?? 0) + 1);
      if (d > 0 && m[type][d - 1]?.id === r.id) p += 0.5;
    }
    for (const n of count.values()) if (n > 1) p += (n - 1) * 0.5;
  }
  return p;
}

export function dailyMacrosOf(st: PlanState, ctx: PlanContext): Macros[] {
  const days: Macros[][] = Array.from({ length: 7 }, () => []);
  for (const [key, id] of st.assign) {
    if (!id) continue;
    days[slotOf(key).day]!.push(ctx.macrosOf.get(id) ?? ZERO_MACROS);
  }
  return days.map(sumMacros);
}

export function totalCost(st: PlanState, ctx: PlanContext): CostBreakdown {
  const variety = varietyPenalty(st, ctx);
  const nutrition = nutritionPenalty(dailyMacrosOf(st, ctx), ctx.target);
  const w = ctx.params.weights;
  return {
    waste: st.waste,
    variety,
    nutrition,
    budget: st.price,
    total: w.waste * st.waste + w.variety * variety + w.nutrition * nutrition + ctx.budgetWeight * st.price,
  };
}

// ---------------------------------------------------------------------------
// Recherche : glouton, recuit, batch cooking
// ---------------------------------------------------------------------------

/** Candidats encore utilisables pour un créneau (unicité stricte pour déjeuners/dîners, souple sinon). */
function availableCandidates(st: PlanState, ctx: PlanContext, key: string): readonly RecipeId[] {
  const all = ctx.candidates.get(key) ?? [];
  const unused = all.filter((id) => !st.useCount.has(id));
  if (unused.length > 0) return unused;
  return UNIQUE_TYPES.has(slotOf(key).type) ? [] : all;
}

/** Ordre de remplissage : dîners, déjeuners, petits-déjeuners, collations (jour croissant). */
function greedyOrder(slots: readonly MealSlot[]): MealSlot[] {
  const rank: Record<MealType, number> = { dinner: 0, lunch: 1, breakfast: 2, snack: 3 };
  return [...slots].sort((a, b) => rank[a.type] - rank[b.type] || a.day - b.day);
}

function scoreCandidate(st: PlanState, ctx: PlanContext, key: string, id: RecipeId): number {
  const d = wasteDelta(st, ctx, id, 1);
  st.assign.set(key, id); // essai à blanc pour variété/nutrition (besoins non touchés)
  const v = varietyPenalty(st, ctx);
  const n = nutritionPenalty(dailyMacrosOf(st, ctx), ctx.target);
  st.assign.set(key, null);
  const w = ctx.params.weights;
  return w.waste * d.waste + ctx.budgetWeight * d.price + w.variety * v + w.nutrition * n;
}

export function greedyBuild(st: PlanState, ctx: PlanContext, rng: Rng): void {
  for (const slot of greedyOrder(ctx.slots)) {
    const key = slotKey(slot);
    if (st.assign.get(key)) continue;
    const scored = availableCandidates(st, ctx, key).map((id) => ({ id, c: scoreCandidate(st, ctx, key, id) }));
    if (scored.length === 0) continue;
    scored.sort((a, b) => a.c - b.c);
    const pick = scored[randomInt(rng, Math.min(ctx.params.greedyTopK, scored.length))]!;
    applyAssign(st, ctx, key, pick.id);
  }
}

export function anneal(st: PlanState, ctx: PlanContext, rng: Rng): PlanState {
  const batchSources = new Set(st.batchOf.values());
  const keys = [...st.assign.keys()].filter((k) => !st.fixed.has(k) && !st.batchOf.has(k) && !batchSources.has(k));
  if (keys.length === 0) return st;
  const { iterations, t0, tEnd } = ctx.params.anneal;
  let current = totalCost(st, ctx).total;
  let best = cloneState(st);
  let bestCost = current;
  const alpha = iterations > 0 ? Math.pow(tEnd / t0, 1 / iterations) : 1;
  let temperature = t0;

  for (let it = 0; it < iterations; it++, temperature *= alpha) {
    let undo: (() => void) | null = null;
    if (rng() < 0.7) {
      const key = keys[randomInt(rng, keys.length)]!;
      const prev = st.assign.get(key) ?? null;
      const cands = availableCandidates(st, ctx, key).filter((id) => id !== prev);
      if (cands.length === 0) continue;
      const next = cands[randomInt(rng, cands.length)]!;
      applyAssign(st, ctx, key, next);
      undo = () => applyAssign(st, ctx, key, prev);
    } else {
      const k1 = keys[randomInt(rng, keys.length)]!;
      const sameType = keys.filter((k) => k !== k1 && slotOf(k).type === slotOf(k1).type);
      if (sameType.length === 0) continue;
      const k2 = sameType[randomInt(rng, sameType.length)]!;
      const a = st.assign.get(k1) ?? null;
      const b = st.assign.get(k2) ?? null;
      if (!a || !b || !ctx.candidates.get(k1)!.includes(b) || !ctx.candidates.get(k2)!.includes(a)) continue;
      st.assign.set(k1, b);
      st.assign.set(k2, a); // les besoins ne changent pas
      undo = () => {
        st.assign.set(k1, a);
        st.assign.set(k2, b);
      };
    }
    const next = totalCost(st, ctx).total;
    const delta = next - current;
    if (delta <= 0 || rng() < Math.exp(-delta / temperature)) {
      current = next;
      if (current < bestCost - 1e-9) {
        bestCost = current;
        best = cloneState(st);
      }
    } else {
      undo();
    }
  }
  return best;
}

/**
 * Batch cooking : un dîner `batchable` est doublé pour fournir le déjeuner du lendemain
 * (même recette affectée au déjeuner, marquée `batchOf`). Une session de cuisine économisée
 * vaut `params.batchBonus` : le batch est accepté si le surcoût reste sous ce bonus.
 * Un dîner déjà cuisiné n'est jamais doublé ; un dîner verrouillé peut l'être.
 */
export function applyBatchCooking(st: PlanState, ctx: PlanContext): PlanState {
  let applied = 0;
  let current = totalCost(st, ctx).total;
  for (let d = 0; d < 6 && applied < ctx.params.maxBatchPerWeek; d++) {
    const dinnerKey = slotKey({ day: d as MealSlot['day'], type: 'dinner' });
    const lunchKey = slotKey({ day: (d + 1) as MealSlot['day'], type: 'lunch' });
    const dinnerId = st.assign.get(dinnerKey);
    if (!dinnerId || !st.assign.has(lunchKey) || st.fixed.has(lunchKey) || st.batchOf.has(lunchKey)) continue;
    if (st.batchOf.has(dinnerKey) || st.cooked.has(dinnerKey)) continue;
    if (!ctx.recipes.get(dinnerId)?.batchable) continue;
    const prevLunch = st.assign.get(lunchKey) ?? null;
    applyAssign(st, ctx, lunchKey, dinnerId);
    st.batchOf.set(lunchKey, dinnerKey);
    const next = totalCost(st, ctx).total;
    if (next < current + ctx.params.batchBonus) {
      current = next;
      applied++;
    } else {
      st.batchOf.delete(lunchKey);
      applyAssign(st, ctx, lunchKey, prevLunch);
    }
  }
  return st;
}

// ---------------------------------------------------------------------------
// Conversion état ↔ plan
// ---------------------------------------------------------------------------

/** Reconstruit l'état de recherche à partir d'un plan existant (swap, coût, suggestions). */
export function stateFromPlan(plan: WeekPlan, ctx: PlanContext): PlanState {
  const st = emptyState(ctx.slots);
  const sources = new Set(plan.meals.filter((m) => m.leftoverOf).map((m) => m.leftoverOf!));
  for (const meal of plan.meals) {
    const key = meal.id;
    if (!st.assign.has(key)) st.assign.set(key, null);
    let factor = 1;
    if (!meal.leftoverOf) {
      factor = meal.servings / ctx.profile.persons - (sources.has(meal.id) ? 1 : 0);
      if (factor <= 0) factor = 1;
    }
    applyAssign(st, ctx, key, meal.recipeId, factor);
    if (meal.leftoverOf) st.batchOf.set(key, meal.leftoverOf);
    if (meal.locked || meal.cooked) st.fixed.add(key);
    if (meal.cooked) st.cooked.add(key);
  }
  return st;
}

export function toWeekPlan(st: PlanState, ctx: PlanContext, input: Pick<GenerateInput, 'weekStart' | 'seed' | 'dataset' | 'keep'>): WeekPlan {
  const persons = ctx.profile.persons;
  const kept = new Map((input.keep ?? []).map((m) => [m.id, m]));
  const sources = new Set(st.batchOf.values());
  const meals: Meal[] = [];
  const unfilled: MealSlot[] = [];
  const keys = [...st.assign.keys()].sort((a, b) => {
    const sa = slotOf(a);
    const sb = slotOf(b);
    return sa.day - sb.day || TYPE_ORDER[sa.type] - TYPE_ORDER[sb.type];
  });
  for (const key of keys) {
    const recipeId = st.assign.get(key);
    const slot = slotOf(key);
    if (!recipeId) {
      unfilled.push(slot);
      continue;
    }
    const previous = kept.get(key);
    const leftoverOf = st.batchOf.get(key);
    const factor = st.factor.get(key) ?? 1;
    const servings = leftoverOf ? 0 : Math.round(persons * (factor + (sources.has(key) ? 1 : 0)));
    meals.push({
      id: key,
      slot,
      recipeId,
      servings,
      locked: previous?.locked ?? false,
      cooked: previous?.cooked ?? false,
      ...(leftoverOf ? { leftoverOf } : {}),
    });
  }
  return {
    id: `${input.weekStart}-${input.seed}`,
    weekStart: input.weekStart,
    seed: input.seed,
    datasetVersion: input.dataset.version,
    profileSnapshot: ctx.profile,
    meals,
    unfilled,
    cost: totalCost(st, ctx),
  };
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export function generateWeekPlan(input: GenerateInput): WeekPlan {
  const ctx = buildPlanContext(input);
  const rng = mulberry32(input.seed);
  const st = emptyState(ctx.slots);

  // Repas conservés (verrouillés / cuisinés) : posés d'abord, jamais déplacés.
  const keep = (input.keep ?? []).filter((m) => st.assign.has(m.id) && ctx.recipes.has(m.recipeId));
  const keptIds = new Set(keep.map((m) => m.id));
  const sources = new Set(keep.filter((m) => m.leftoverOf && keptIds.has(m.leftoverOf)).map((m) => m.leftoverOf!));
  for (const meal of keep) {
    if (meal.leftoverOf && !keptIds.has(meal.leftoverOf)) continue; // restes orphelins : le créneau est regénéré
    let factor = 1;
    if (!meal.leftoverOf) {
      factor = meal.servings / ctx.profile.persons - (sources.has(meal.id) ? 1 : 0);
      if (factor <= 0) factor = 1;
    }
    applyAssign(st, ctx, meal.id, meal.recipeId, factor);
    if (meal.leftoverOf) st.batchOf.set(meal.id, meal.leftoverOf);
    st.fixed.add(meal.id);
    if (meal.cooked) st.cooked.add(meal.id);
  }

  greedyBuild(st, ctx, rng);
  const best = anneal(st, ctx, rng);
  const withBatch = ctx.profile.allowBatchCooking ? applyBatchCooking(best, ctx) : best;
  return toWeekPlan(withBatch, ctx, input);
}
