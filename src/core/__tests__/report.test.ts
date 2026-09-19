import { computeTarget, weekNutrition } from '../nutrition';
import { sharedSavings, weekReport } from '../report';
import { buildShoppingList } from '../shopping';
import { indexIngredients, indexRecipes } from '../dataset';
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
    expect(orphanIds).not.toContain('pates_penne'); // 300 g de reste mais longue conservation : pas un gaspillage
    expect(orphanIds).toEqual(['lait', 'oeuf']); // brique entamée et 2 œufs sur 6, un seul repas chacun
    for (const o of r.orphanLeftovers) expect(o.quantity).toBeGreaterThan(0);
  });

  it('savedEur ne compte que les périssables partagés : le lait de 2 repas évite une brique, l’huile (staple) non', () => {
    const INGREDIENTS = indexIngredients(FIXTURE_INGREDIENTS);
    // omelette (2 c. à s. de lait) + pancakes (200 ml) : 2 briques séparément, 1 en agrégé → 1,10 €
    const shared = buildShoppingList({
      plan: makePlan([makeMeal(0, 'dinner', 'omelette'), makeMeal(1, 'breakfast', 'pancakes_miel')], PROFILE),
      dataset: DATASET,
      profile: PROFILE,
      pantry: [],
      checked: {},
      packChoices: {},
      manualItems: [],
    });
    expect(sharedSavings(shared, INGREDIENTS)).toBeCloseTo(1.1 + 2.1, 2); // lait + œufs (4 + 1 = 5 : 2 boîtes séparément, 1 en agrégé)
    expect(sharedSavings(list, INGREDIENTS)).toBe(0); // huile partagée mais staple ; pâtes et coriandre non partagées
    const single = buildShoppingList({
      plan: makePlan([makeMeal(0, 'dinner', 'pates_poulet')], PROFILE),
      dataset: DATASET,
      profile: PROFILE,
      pantry: [],
      checked: {},
      packChoices: {},
      manualItems: [],
    });
    expect(sharedSavings(single, INGREDIENTS)).toBe(0);
  });
});
