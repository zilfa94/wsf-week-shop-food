import { computeTarget, weekNutrition } from '../nutrition';
import { sharedSavings, weekReport } from '../report';
import { buildShoppingList } from '../shopping';
import { indexRecipes } from '../dataset';
import { makeMeal, makePlan } from './fixtures/plans';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2 } from './fixtures/recipes';

const DATASET = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };
const PROFILE = { ...OMNIVORE_2, assumeStaples: false };

describe('weekReport', () => {
  const plan = makePlan(
    [
      makeMeal(0, 'dinner', 'pates_poulet', { cooked: true }),
      makeMeal(1, 'breakfast', 'omelette', { cooked: true }),
      makeMeal(3, 'dinner', 'curry_pois_chiches'),
    ],
    PROFILE,
  );
  const list = buildShoppingList({ plan, dataset: DATASET, profile: PROFILE, pantry: [], checked: {}, packChoices: {}, manualItems: [] });
  const days = weekNutrition(plan, indexRecipes(FIXTURE_RECIPES), computeTarget(PROFILE));

  it('compte les repas cuisinés, reprend les scores et liste les restes orphelins', () => {
    const r = weekReport({ plan, list, days, dataset: DATASET });
    expect(r.cookedMeals).toBe(2);
    expect(r.totalMeals).toBe(3);
    expect(r.wasteScore).toBe(list.wasteScore);
    expect(r.balanceScore).toBeGreaterThanOrEqual(0);
    expect(r.balanceScore).toBeLessThanOrEqual(100);
    const orphanIds = r.orphanLeftovers.map((o) => o.ingredientId);
    expect(orphanIds).not.toContain('tomate'); // réutilisée jeudi
    expect(orphanIds).toContain('pates_penne'); // 300 g de reste, un seul repas
    for (const o of r.orphanLeftovers) expect(o.quantity).toBeGreaterThan(0);
  });

  it('savedEur : l’huile partagée par 3 repas évite 2 bouteilles', () => {
    // 30 ml + 5 ml + 15 ml : 3 bouteilles achetées séparément, 1 seule en agrégé → 2 × 6,50 €
    expect(sharedSavings(list)).toBeGreaterThanOrEqual(13);
    const single = buildShoppingList({
      plan: makePlan([makeMeal(0, 'dinner', 'pates_poulet')], PROFILE),
      dataset: DATASET,
      profile: PROFILE,
      pantry: [],
      checked: {},
      packChoices: {},
      manualItems: [],
    });
    expect(sharedSavings(single)).toBe(0);
  });
});
