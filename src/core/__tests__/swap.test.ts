import { generateWeekPlan } from '../planner';
import { buildShoppingList, itemKey } from '../shopping';
import { applySwap, suggestSwaps } from '../swap';
import type { GenerateInput, Meal, PantryItem } from '../types';
import { makeMeal, makePlan } from './fixtures/plans';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2, makeRecipe } from './fixtures/recipes';
import { SYNTHETIC_DATASET } from './fixtures/synthetic';

const SMALL = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };
const INPUT: GenerateInput = {
  dataset: SYNTHETIC_DATASET,
  profile: OMNIVORE_2,
  pantry: [],
  weekStart: '2026-09-14',
  today: '2026-09-12',
  seed: 5,
  params: { anneal: { iterations: 200 } },
};

describe('suggestSwaps', () => {
  it('propose les alternatives éligibles du créneau, sans la recette courante ni celles du plan, triées par score', () => {
    // mardi soir (30 min max) : omelette et saumon ; pâtes au poulet déjà dans le plan ; curry trop long
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'omelette')]);
    const s = suggestSwaps({ plan, mealId: '1-dinner', dataset: SMALL, profile: OMNIVORE_2, pantry: [], checked: {} });
    expect(s.map((x) => x.recipeId)).toEqual(['saumon_poele']);
    expect(s[0]!.newIngredientIds).toEqual(['saumon']);
    expect(s[0]!.deltaItems).toBe(1 - 2); // saumon (1 article) remplace omelette (œufs + lait : 2 articles)
    expect(s[0]!.reasons.some((r) => r.startsWith('−1 article · +'))).toBe(true);
    expect(s[0]!.reasons.some((r) => r.startsWith('Plus rapide'))).toBe(false); // 25 min contre 10
  });

  it('un créneau vide accepte des suggestions ; le garde-manger fait apparaître « Utilise vos restes »', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const pantry: PantryItem[] = [
      { ingredientId: 'oeuf', quantity: 6, addedAt: '2026-09-10' },
      { ingredientId: 'lait', quantity: 500, addedAt: '2026-09-10' },
    ];
    const s = suggestSwaps({ plan, mealId: '1-dinner', dataset: SMALL, profile: OMNIVORE_2, pantry, checked: {} });
    const omelette = s.find((x) => x.recipeId === 'omelette')!;
    expect(omelette.newIngredientIds).toEqual([]);
    expect([...omelette.reusedIngredientIds].sort()).toEqual(['lait', 'oeuf']);
    expect(omelette.reasons[0]).toBe('Utilise vos restes d’œufs et de lait');
    expect(omelette.reasons).toContain('Aucun achat supplémentaire');
    expect(omelette.deltaPrice).toBe(0);
    expect(s[0]!.recipeId).toBe('omelette'); // rien à acheter : meilleur score
  });

  it('un article déjà coché (acheté) est acquis : la recette qui l’utilise ne le rachète pas', () => {
    const eggsTomatoes = makeRecipe({
      id: 'oeufs_tomates',
      name: 'Œufs aux tomates',
      ingredients: [{ ingredientId: 'oeuf', quantity: 2, unit: 'piece' }, { ingredientId: 'tomate', quantity: 2, unit: 'piece' }],
      mainProtein: 'egg',
      prepMin: 5,
      cookMin: 10,
    });
    const dataset = { ...SMALL, recipes: [...SMALL.recipes, eggsTomatoes] };
    const plan = makePlan([makeMeal(0, 'dinner', 'omelette')]);
    const base = { plan, mealId: '0-dinner', dataset, profile: OMNIVORE_2, pantry: [] };
    const unchecked = suggestSwaps({ ...base, checked: {} }).find((s) => s.recipeId === 'oeufs_tomates')!;
    const checked = suggestSwaps({ ...base, checked: { [itemKey(plan.id, 'oeuf')]: true } }).find((s) => s.recipeId === 'oeufs_tomates')!;
    expect(unchecked.newIngredientIds).toEqual(['oeuf', 'tomate']);
    expect(unchecked.reusedIngredientIds).toEqual([]);
    expect(checked.newIngredientIds).toEqual(['tomate']);
    expect(checked.reusedIngredientIds).toEqual(['oeuf']);
    expect(checked.reasons[0]).toBe('Utilise vos restes d’œufs');
    expect(checked.score).toBeLessThan(unchecked.score);
  });

  it('sur un vrai plan : triées par score, jamais une recette du plan, limite respectée', () => {
    const plan = generateWeekPlan(INPUT);
    const base = { plan, dataset: SYNTHETIC_DATASET, profile: OMNIVORE_2, pantry: [], limit: 50 };
    // samedi soir (90 min) : tous les plats non utilisés sont candidats ; en semaine (30 min) il n'en reste qu'un
    const all = suggestSwaps({ ...base, mealId: '5-dinner', checked: {} });
    expect(all.length).toBeGreaterThan(3);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.score).toBeLessThanOrEqual(all[i]!.score);
    const inPlan = new Set(plan.meals.map((m) => m.recipeId));
    for (const s of all) expect(inPlan.has(s.recipeId)).toBe(false);
    expect(suggestSwaps({ ...base, mealId: '5-dinner', checked: {}, limit: 3 })).toHaveLength(3);
    expect(suggestSwaps({ ...base, mealId: '3-dinner', checked: {} }).length).toBeLessThanOrEqual(2);
    const list = buildShoppingList({ plan, dataset: SYNTHETIC_DATASET, profile: OMNIVORE_2, pantry: [], checked: {}, packChoices: {}, manualItems: [] });
    expect(list.items.length).toBeGreaterThan(0);
  });
});

describe('applySwap', () => {
  it('remplace et verrouille le repas, conserve les autres, recalcule le coût', () => {
    const plan = generateWeekPlan(INPUT);
    const before = plan.meals.find((m) => m.id === '2-dinner')!;
    const candidate = suggestSwaps({ plan, mealId: '2-dinner', dataset: SYNTHETIC_DATASET, profile: OMNIVORE_2, pantry: [], checked: {} })[0]!;
    const next = applySwap(plan, '2-dinner', candidate.recipeId, SYNTHETIC_DATASET, OMNIVORE_2, []);
    const after = next.meals.find((m) => m.id === '2-dinner')!;
    expect(after.recipeId).toBe(candidate.recipeId);
    expect(after.recipeId).not.toBe(before.recipeId);
    expect(after).toMatchObject({ locked: true, cooked: false, servings: 2 });
    for (const m of plan.meals) {
      if (m.id === '2-dinner' || m.leftoverOf === '2-dinner') continue;
      expect(next.meals.find((x) => x.id === m.id)).toEqual(m);
    }
    const mains = next.meals.filter((m) => (m.slot.type === 'lunch' || m.slot.type === 'dinner') && !m.leftoverOf).map((m) => m.recipeId);
    expect(new Set(mains).size).toBe(mains.length);
    expect(next.cost.total).not.toBe(plan.cost.total);
    expect(applySwap(plan, 'inconnu', 'plat_1', SYNTHETIC_DATASET, OMNIVORE_2, [])).toBe(plan);
  });

  it('remplacer le dîner source d’un batch regénère le déjeuner « restes » lié', () => {
    const lockedDinner: Meal = { id: '0-dinner', slot: { day: 0, type: 'dinner' }, recipeId: 'plat_0', servings: 2, locked: true, cooked: false };
    const plan = generateWeekPlan({ ...INPUT, params: { anneal: { iterations: 200 }, batchBonus: 100 }, keep: [lockedDinner] });
    expect(plan.meals.find((m) => m.id === '1-lunch')!.leftoverOf).toBe('0-dinner');
    const next = applySwap(plan, '0-dinner', 'plat_4', SYNTHETIC_DATASET, OMNIVORE_2, []);
    const dinner = next.meals.find((m) => m.id === '0-dinner')!;
    const lunch = next.meals.find((m) => m.id === '1-lunch')!;
    expect(dinner).toMatchObject({ recipeId: 'plat_4', servings: 2, locked: true });
    expect(lunch.leftoverOf).toBeUndefined();
    expect(lunch.servings).toBe(2);
    expect(lunch.recipeId).not.toBe('plat_4');
    // le glouton de réparation peut aussi remplir un créneau resté vide : jamais moins de repas qu'avant
    expect(next.meals.length).toBeGreaterThanOrEqual(plan.meals.length);
  });

  it('remplacer un déjeuner « restes » rend ses portions normales au dîner source', () => {
    const lockedDinner: Meal = { id: '0-dinner', slot: { day: 0, type: 'dinner' }, recipeId: 'plat_0', servings: 2, locked: true, cooked: false };
    const plan = generateWeekPlan({ ...INPUT, params: { anneal: { iterations: 200 }, batchBonus: 100 }, keep: [lockedDinner] });
    expect(plan.meals.find((m) => m.id === '0-dinner')!.servings).toBe(4);
    const next = applySwap(plan, '1-lunch', 'plat_4', SYNTHETIC_DATASET, OMNIVORE_2, []);
    expect(next.meals.find((m) => m.id === '0-dinner')!.servings).toBe(2);
    expect(next.meals.find((m) => m.id === '1-lunch')).toMatchObject({ recipeId: 'plat_4', servings: 2, locked: true });
  });
});
