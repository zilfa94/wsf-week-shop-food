/**
 * Remplacement d'un repas « à impact » : la liste de courses courante devient un garde-manger
 * virtuel (les articles cochés sont acquis) et chaque alternative est évaluée par ses nouveaux
 * achats et sa variation de coût. Voir docs/SPEC.md § 4.5.
 */
import { totalMinutes } from './filter';
import {
  applyAssign,
  buildPlanContext,
  greedyBuild,
  stateFromPlan,
  toWeekPlan,
  totalCost,
  type PlanContext,
  type PlanState,
} from './planner';
import { EPS, roundToPackaging } from './packaging';
import { mulberry32 } from './rng';
import { buildShoppingList } from './shopping';
import type { Dataset, ISODate, IngredientId, PantryItem, RecipeId, SwapSuggestion, UserProfile, WeekPlan } from './types';
import { formatPrice, ingredientName } from './units';

export interface SwapArgs {
  readonly plan: WeekPlan;
  readonly mealId: string;
  readonly dataset: Dataset;
  readonly profile: UserProfile;
  readonly pantry: readonly PantryItem[];
  /** État coché de la liste courante (`itemKey` → coché) : un article coché est considéré acquis. */
  readonly checked: Readonly<Record<string, boolean>>;
  readonly limit?: number;
}

interface PurchaseDelta {
  newItems: IngredientId[];
  reused: IngredientId[];
  price: number;
  items: number;
}

/** Garde-manger virtuel : le vrai stock + les articles déjà cochés (achetés). */
function virtualPantry(args: SwapArgs): PantryItem[] {
  const list = buildShoppingList({
    plan: args.plan,
    dataset: args.dataset,
    profile: args.profile,
    pantry: args.pantry,
    checked: args.checked,
    packChoices: {},
    manualItems: [],
  });
  const bought = list.items
    .filter((i) => i.checked && i.bought > EPS)
    .map((i) => ({ ingredientId: i.ingredientId, quantity: i.bought, addedAt: args.plan.weekStart }));
  return [...args.pantry, ...bought];
}

function contextFor(args: Pick<SwapArgs, 'plan' | 'dataset' | 'profile'>, pantry: readonly PantryItem[]): PlanContext {
  return buildPlanContext({
    dataset: args.dataset,
    profile: args.profile,
    pantry,
    weekStart: args.plan.weekStart,
    today: args.plan.weekStart,
    seed: args.plan.seed,
  });
}

/** Retire le repas du créneau, ainsi que le déjeuner « restes » qui en dépendrait. */
function detach(st: PlanState, ctx: PlanContext, mealId: string): void {
  for (const [lunchKey, source] of [...st.batchOf.entries()]) {
    if (source === mealId) {
      applyAssign(st, ctx, lunchKey, null);
      st.batchOf.delete(lunchKey);
    }
  }
  st.batchOf.delete(mealId);
  applyAssign(st, ctx, mealId, null);
}

/** Nouveaux achats induits par l'ajout d'une recette à l'état courant (sans modifier l'état). */
function purchaseDelta(st: PlanState, ctx: PlanContext, recipeId: RecipeId): PurchaseDelta {
  const out: PurchaseDelta = { newItems: [], reused: [], price: 0, items: 0 };
  const needs = ctx.needsOf.get(recipeId);
  if (!needs) return out;
  for (const [ingId, q] of needs) {
    const ing = ctx.ingredients.get(ingId)!;
    const pantry = ctx.pantry.get(ingId) ?? 0;
    const before = st.needs.get(ingId) ?? 0;
    const packsBefore = roundToPackaging(ing.packaging, Math.max(0, before - pantry)).packs;
    const packsAfter = roundToPackaging(ing.packaging, Math.max(0, before + q - pantry)).packs;
    const dPacks = packsAfter - packsBefore;
    if (dPacks > 0) {
      out.price += dPacks * ing.packaging.price;
      if (packsBefore === 0) {
        out.newItems.push(ingId);
        out.items += 1;
      }
    } else if (!ing.staple && (before > EPS || pantry > EPS)) {
      out.reused.push(ingId);
    }
  }
  return out;
}

export function suggestSwaps(args: SwapArgs): SwapSuggestion[] {
  const limit = args.limit ?? 5;
  const ctx = contextFor(args, virtualPantry(args));
  const st = stateFromPlan(args.plan, ctx);
  const current = st.assign.get(args.mealId) ?? null;
  if (current === null && !st.assign.has(args.mealId)) return [];
  detach(st, ctx, args.mealId);
  const base = totalCost(st, ctx).total;

  const currentDelta = current ? purchaseDelta(st, ctx, current) : { newItems: [], reused: [], price: 0, items: 0 };
  const currentRecipe = current ? ctx.recipes.get(current) : undefined;

  const out: SwapSuggestion[] = [];
  for (const id of ctx.candidates.get(args.mealId) ?? []) {
    if (id === current || st.useCount.has(id)) continue;
    const delta = purchaseDelta(st, ctx, id);
    applyAssign(st, ctx, args.mealId, id);
    const cost = totalCost(st, ctx).total;
    applyAssign(st, ctx, args.mealId, null);

    const recipe = ctx.recipes.get(id)!;
    const deltaItems = delta.items - currentDelta.items;
    const deltaPrice = round2(delta.price - currentDelta.price);
    const reasons: string[] = [];
    if (delta.reused.length > 0) {
      const names = delta.reused.slice(0, 2).map((i) => withDe(ingredientName(ctx.ingredients.get(i)!, 2)));
      reasons.push(`Utilise vos restes ${names.join(' et ')}`);
    }
    if (deltaItems > 0) reasons.push(`+${deltaItems} article${deltaItems > 1 ? 's' : ''} · ${signed(deltaPrice)}`);
    else if (deltaItems < 0) reasons.push(`−${-deltaItems} article${deltaItems < -1 ? 's' : ''} · ${signed(deltaPrice)}`);
    else if (Math.abs(deltaPrice) < 0.005) reasons.push('Aucun achat supplémentaire');
    else reasons.push(signed(deltaPrice));
    if (currentRecipe) {
      const dt = totalMinutes(recipe) - totalMinutes(currentRecipe);
      if (dt < 0) reasons.push(`Plus rapide (${-dt} min de moins)`);
      else if (dt === 0) reasons.push('Même temps de cuisson');
    }

    out.push({
      recipeId: id,
      score: delta.price + (cost - base),
      deltaItems,
      deltaPrice,
      reusedIngredientIds: delta.reused,
      newIngredientIds: delta.newItems,
      reasons,
    });
  }
  return out.sort((a, b) => a.score - b.score || a.recipeId.localeCompare(b.recipeId)).slice(0, limit);
}

/**
 * Applique un remplacement : le repas est verrouillé avec la nouvelle recette ; un déjeuner
 * « restes » qui dépendait de lui est regénéré (glouton déterministe) ; si le repas remplacé
 * était lui-même un reste, son dîner source repasse à des portions normales. Le coût est recalculé.
 */
export function applySwap(
  plan: WeekPlan,
  mealId: string,
  recipeId: RecipeId,
  dataset: Dataset,
  profile: UserProfile,
  pantry: readonly PantryItem[],
  today?: ISODate,
): WeekPlan {
  const target = plan.meals.find((m) => m.id === mealId);
  if (!target) return plan;
  const orphanIds = new Set(plan.meals.filter((m) => m.leftoverOf === mealId).map((m) => m.id));
  const meals = plan.meals
    .filter((m) => !orphanIds.has(m.id))
    .map((m) => {
      if (m.id === mealId) {
        const { leftoverOf: _dropped, ...rest } = m;
        return { ...rest, recipeId, servings: profile.persons, locked: true, cooked: false };
      }
      if (target.leftoverOf && m.id === target.leftoverOf) return { ...m, servings: profile.persons };
      return m;
    });

  const ctx = buildPlanContext({ dataset, profile, pantry, weekStart: plan.weekStart, today: today ?? plan.weekStart, seed: plan.seed });
  const st = stateFromPlan({ ...plan, meals }, ctx);
  for (const id of orphanIds) if (!st.assign.has(id)) st.assign.set(id, null);
  greedyBuild(st, ctx, mulberry32(plan.seed));
  return toWeekPlan(st, ctx, { weekStart: plan.weekStart, seed: plan.seed, dataset, keep: meals });
}

/** « de » avec élision devant une voyelle ou un h muet : « d'ail », « de poivrons ». */
export function withDe(name: string): string {
  return /^[aeiouyàâäéèêëïîôöùûüœh]/i.test(name) ? `d’${name}` : `de ${name}`;
}

function signed(eur: number): string {
  const s = formatPrice(Math.abs(eur));
  return eur < 0 ? `−${s}` : `+${s}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
