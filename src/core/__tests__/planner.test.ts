import {
  anneal,
  applyAssign,
  buildPlanContext,
  emptyState,
  generateWeekPlan,
  greedyBuild,
  stateFromPlan,
  totalCost,
  wasteDelta,
} from '../planner';
import { mulberry32 } from '../rng';
import type { GenerateInput, Meal, WeekPlan } from '../types';
import { CORIANDER, PASTA, makeIngredient } from './fixtures/ingredients';
import { OMNIVORE_2, VEGAN_GF_1, makeRecipe } from './fixtures/recipes';
import { SYNTHETIC_DATASET } from './fixtures/synthetic';

const BASE: GenerateInput = {
  dataset: SYNTHETIC_DATASET,
  profile: OMNIVORE_2,
  pantry: [],
  weekStart: '2026-09-14',
  today: '2026-09-12',
  seed: 42,
};

/** Recuit court pour les tests de propriétés (la génération complète est testée à part). */
const FAST = { anneal: { iterations: 300 } };

function mainsOf(plan: WeekPlan): Meal[] {
  return plan.meals.filter((m) => m.slot.type === 'lunch' || m.slot.type === 'dinner');
}

describe('generateWeekPlan', () => {
  it('est déterministe : même seed → même plan, seed différente → plan différent', () => {
    const a = generateWeekPlan({ ...BASE, params: FAST });
    const b = generateWeekPlan({ ...BASE, params: FAST });
    const c = generateWeekPlan({ ...BASE, params: FAST, seed: 43 });
    expect(a).toEqual(b);
    expect(c.meals.map((m) => m.recipeId)).not.toEqual(a.meals.map((m) => m.recipeId));
    expect(a.id).toBe('2026-09-14-42');
  });

  it('remplit les 21 créneaux d’un omnivore, sans dupliquer une recette de déjeuner/dîner', () => {
    const plan = generateWeekPlan({ ...BASE, params: FAST });
    expect(plan.meals).toHaveLength(21);
    expect(plan.unfilled).toEqual([]);
    const mains = mainsOf(plan).filter((m) => !m.leftoverOf).map((m) => m.recipeId);
    expect(new Set(mains).size).toBe(mains.length);
    for (const m of plan.meals) {
      expect(m.id).toBe(`${m.slot.day}-${m.slot.type}`);
      if (!m.leftoverOf) expect(m.servings).toBeGreaterThanOrEqual(2);
    }
    expect(plan.cost.total).toBeGreaterThanOrEqual(0);
    expect(plan.profileSnapshot).toBe(OMNIVORE_2);
    expect(plan.datasetVersion).toBe('synthetic-1');
  });

  it('respecte les contraintes de temps (déjeuners/dîners en semaine ≤ 30 min)', () => {
    const plan = generateWeekPlan({ ...BASE, params: FAST });
    for (const m of mainsOf(plan)) {
      const r = SYNTHETIC_DATASET.recipes.find((x) => x.id === m.recipeId)!;
      const max = m.slot.day >= 5 ? 90 : 30;
      expect(r.prepMin + r.cookMin).toBeLessThanOrEqual(max);
    }
  });

  it('conserve les repas verrouillés et cuisinés à leur place', () => {
    const first = generateWeekPlan({ ...BASE, params: FAST });
    const locked = { ...first.meals.find((m) => m.id === '2-dinner')!, locked: true };
    const cooked = { ...first.meals.find((m) => m.id === '4-lunch')!, cooked: true };
    const next = generateWeekPlan({ ...BASE, params: FAST, seed: 99, keep: [locked, cooked] });
    expect(next.meals.find((m) => m.id === '2-dinner')).toMatchObject({ recipeId: locked.recipeId, locked: true });
    expect(next.meals.find((m) => m.id === '4-lunch')).toMatchObject({ recipeId: cooked.recipeId, cooked: true });
    const mains = mainsOf(next).filter((m) => !m.leftoverOf).map((m) => m.recipeId);
    expect(new Set(mains).size).toBe(mains.length);
  });

  it('batch cooking : un dîner batchable doublé nourrit le déjeuner du lendemain', () => {
    // plat_0 est batchable (30 min au total : autorisé en semaine) ; verrouillé, il peut être doublé
    const lockedDinner: Meal = { id: '0-dinner', slot: { day: 0, type: 'dinner' }, recipeId: 'plat_0', servings: 2, locked: true, cooked: false };
    const plan = generateWeekPlan({ ...BASE, params: { ...FAST, batchBonus: 100 }, keep: [lockedDinner] });
    const leftovers = plan.meals.filter((m) => m.leftoverOf);
    expect(leftovers.length).toBeGreaterThan(0);
    expect(leftovers.length).toBeLessThanOrEqual(2);
    expect(leftovers.some((l) => l.leftoverOf === '0-dinner')).toBe(true);
    for (const l of leftovers) {
      const source = plan.meals.find((m) => m.id === l.leftoverOf)!;
      expect(source.slot.type).toBe('dinner');
      expect(source.slot.day).toBe(l.slot.day - 1);
      expect(source.recipeId).toBe(l.recipeId);
      expect(source.servings).toBe(4);
      expect(l.servings).toBe(0);
      expect(l.slot.type).toBe('lunch');
    }
    // un dîner déjà cuisiné n'est jamais doublé
    const cookedDinner: Meal = { ...lockedDinner, cooked: true };
    const cookedPlan = generateWeekPlan({ ...BASE, params: { ...FAST, batchBonus: 100 }, keep: [cookedDinner] });
    expect(cookedPlan.meals.some((m) => m.leftoverOf === '0-dinner')).toBe(false);
    expect(cookedPlan.meals.find((m) => m.id === '0-dinner')!.servings).toBe(2);
    // bonus nul : un batch qui augmente le coût est refusé ; batch désactivé : aucun
    const strict = generateWeekPlan({ ...BASE, params: { ...FAST, batchBonus: 0 }, keep: [lockedDinner] });
    expect(strict.meals.some((m) => m.leftoverOf === '0-dinner')).toBe(false);
    const none = generateWeekPlan({ ...BASE, params: FAST, profile: { ...OMNIVORE_2, allowBatchCooking: false } });
    expect(none.meals.some((m) => m.leftoverOf)).toBe(false);
  });

  it('signale les créneaux impossibles au lieu de planter (végétalien sans gluten, données pauvres)', () => {
    const plan = generateWeekPlan({ ...BASE, params: FAST, profile: VEGAN_GF_1 });
    expect(plan.unfilled.length).toBeGreaterThan(0);
    expect(plan.meals.length + plan.unfilled.length).toBe(21);
    for (const m of plan.meals) {
      const r = SYNTHETIC_DATASET.recipes.find((x) => x.id === m.recipeId)!;
      for (const ri of r.ingredients) {
        const ing = SYNTHETIC_DATASET.ingredients.find((x) => x.id === ri.ingredientId)!;
        if (!ri.optional) {
          expect(['plant']).toContain(ing.foodClass);
          expect(ing.allergens).not.toContain('gluten');
        }
      }
    }
  });

  it('génération complète (paramètres par défaut) en moins de 300 ms', () => {
    const t0 = Date.now();
    const plan = generateWeekPlan(BASE);
    expect(Date.now() - t0).toBeLessThan(300);
    expect(plan.unfilled).toEqual([]);
  });
});

describe('état incrémental', () => {
  it('wasteDelta == différence de coût recalculé de zéro (200 mouvements aléatoires)', () => {
    const ctx = buildPlanContext({ ...BASE, params: FAST });
    const st = emptyState(ctx.slots);
    const rng = mulberry32(7);
    const keys = [...st.assign.keys()];
    const recipes = SYNTHETIC_DATASET.recipes.map((r) => r.id);
    for (let i = 0; i < 200; i++) {
      const key = keys[Math.floor(rng() * keys.length)]!;
      const id = recipes[Math.floor(rng() * recipes.length)]!;
      const prev = st.assign.get(key) ?? null;
      const removal = prev ? wasteDelta(st, ctx, prev, -1) : { waste: 0, price: 0 };
      const before = st.waste;
      applyAssign(st, ctx, key, null);
      expect(st.waste).toBeCloseTo(before + removal.waste, 6);
      const addition = wasteDelta(st, ctx, id, 1);
      const mid = st.waste;
      applyAssign(st, ctx, key, id);
      expect(st.waste).toBeCloseTo(mid + addition.waste, 6);
    }
    // recalcul complet
    const fresh = emptyState(ctx.slots);
    for (const [key, id] of st.assign) if (id) applyAssign(fresh, ctx, key, id);
    expect(fresh.waste).toBeCloseTo(st.waste, 6);
    expect(fresh.price).toBeCloseTo(st.price, 6);
  });

  it('le recuit ne dégrade jamais le glouton (10 seeds)', () => {
    const ctx = buildPlanContext({ ...BASE, params: FAST });
    for (let seed = 1; seed <= 10; seed++) {
      const rng = mulberry32(seed);
      const st = emptyState(ctx.slots);
      greedyBuild(st, ctx, rng);
      const greedy = totalCost(st, ctx).total;
      const best = anneal(st, ctx, rng);
      expect(totalCost(best, ctx).total).toBeLessThanOrEqual(greedy + 1e-9);
    }
  });

  it('stateFromPlan reconstruit un état dont le coût est celui du plan', () => {
    const input = { ...BASE, params: FAST };
    const plan = generateWeekPlan(input);
    const ctx = buildPlanContext(input);
    const st = stateFromPlan(plan, ctx);
    expect(totalCost(st, ctx).total).toBeCloseTo(plan.cost.total, 6);
    expect([...st.batchOf.keys()].sort()).toEqual(plan.meals.filter((m) => m.leftoverOf).map((m) => m.id).sort());
  });
});

describe('anti-gaspillage', () => {
  it('préfère la recette qui partage la botte de coriandre déjà achetée', () => {
    const parsley = makeIngredient({ ...CORIANDER, id: 'persil', name: 'persil' });
    const a = makeRecipe({ id: 'a', ingredients: [{ ingredientId: 'pates_penne', quantity: 200, unit: 'g' }, { ingredientId: 'coriandre', quantity: 0.5, unit: 'bunch' }] });
    const b = makeRecipe({ id: 'b', ingredients: [{ ingredientId: 'pates_penne', quantity: 200, unit: 'g' }, { ingredientId: 'coriandre', quantity: 0.5, unit: 'bunch' }] });
    const c = makeRecipe({ id: 'c', ingredients: [{ ingredientId: 'pates_penne', quantity: 200, unit: 'g' }, { ingredientId: 'persil', quantity: 0.5, unit: 'bunch' }] });
    const ctx = buildPlanContext({
      ...BASE,
      dataset: { version: 't', ingredients: [PASTA, CORIANDER, parsley], recipes: [a, b, c] },
      profile: { ...OMNIVORE_2, includeBreakfast: false },
    });
    const st = emptyState(ctx.slots);
    applyAssign(st, ctx, '0-dinner', 'a');
    const shareDelta = wasteDelta(st, ctx, 'b', 1).waste;
    const newHerbDelta = wasteDelta(st, ctx, 'c', 1).waste;
    expect(shareDelta).toBeLessThan(newHerbDelta);
    expect(shareDelta).toBeLessThan(0); // la botte entière est consommée : le reste de coriandre disparaît, le gaspillage baisse
    expect(newHerbDelta).toBeGreaterThan(0); // une nouvelle botte entamée = nouveau reste périssable
  });

  it('le garde-manger réduit le coût de gaspillage', () => {
    const withPantry = buildPlanContext({ ...BASE, pantry: [{ ingredientId: 'pates_penne', quantity: 1000, addedAt: '2026-09-01' }] });
    const without = buildPlanContext(BASE);
    const s1 = emptyState(withPantry.slots);
    const s2 = emptyState(without.slots);
    applyAssign(s1, withPantry, '0-dinner', 'plat_0');
    applyAssign(s2, without, '0-dinner', 'plat_0');
    expect(s1.price).toBeLessThan(s2.price);
    expect(withPantry.pantry.get('pates_penne')).toBe(1000);
    const expired = buildPlanContext({ ...BASE, pantry: [{ ingredientId: 'pates_penne', quantity: 1000, addedAt: '2026-09-01', expiresAt: '2026-09-10' }] });
    expect(expired.pantry.get('pates_penne')).toBeUndefined();
  });
});
