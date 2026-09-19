import { incompatibleMeals, isPlanExpired, mealById, profileDrift, setCooked, setMealServings, toggleLock } from '../plan-edit';
import { makeMeal, makePlan } from './fixtures/plans';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2 } from './fixtures/recipes';

const DATASET = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };
const plan = makePlan([
  makeMeal(0, 'dinner', 'pates_poulet', { servings: 4 }),
  makeMeal(1, 'lunch', 'pates_poulet', { servings: 0, leftoverOf: '0-dinner' }),
  makeMeal(2, 'dinner', 'curry_pois_chiches'),
]);

describe('éditions', () => {
  it('toggleLock / setCooked ne touchent que le repas visé et sont immuables', () => {
    const locked = toggleLock(plan, '0-dinner');
    expect(mealById(locked, '0-dinner')!.locked).toBe(true);
    expect(mealById(plan, '0-dinner')!.locked).toBe(false);
    expect(toggleLock(locked, '0-dinner').meals.find((m) => m.id === '0-dinner')!.locked).toBe(false);
    const cooked = setCooked(plan, '2-dinner', true);
    expect(mealById(cooked, '2-dinner')!.cooked).toBe(true);
    expect(cooked.meals.filter((m) => m.cooked)).toHaveLength(1);
    expect(toggleLock(plan, 'inconnu')).toBe(plan);
  });

  it('setMealServings : ≥ 1, arrondi, sans effet sur un repas « restes »', () => {
    expect(mealById(setMealServings(plan, '2-dinner', 3.4), '2-dinner')!.servings).toBe(3);
    expect(mealById(setMealServings(plan, '2-dinner', 0), '2-dinner')!.servings).toBe(1);
    expect(mealById(setMealServings(plan, '1-lunch', 3), '1-lunch')!.servings).toBe(0);
  });
});

describe('signaux', () => {
  it('isPlanExpired : semaine du 14 → terminée à partir du 21', () => {
    expect(isPlanExpired(plan, '2026-09-20')).toBe(false);
    expect(isPlanExpired(plan, '2026-09-21')).toBe(true);
  });

  it('profileDrift compare au profil de génération', () => {
    expect(profileDrift(plan, OMNIVORE_2)).toEqual([]);
    expect(profileDrift(plan, { ...OMNIVORE_2, persons: 4, diet: 'vegan' })).toEqual(['persons', 'diet']);
    expect(profileDrift(plan, { ...OMNIVORE_2, allergens: ['milk'] })).toEqual(['allergens']);
    expect(profileDrift(plan, { ...OMNIVORE_2, dislikedIngredientIds: ['tomate'] })).toEqual(['dislikes']);
  });

  it('incompatibleMeals liste les repas inéligibles au nouveau profil', () => {
    const vegan = incompatibleMeals(plan, { ...OMNIVORE_2, diet: 'vegan' }, DATASET);
    expect(vegan.map((m) => m.id)).toEqual(['0-dinner', '1-lunch']);
    expect(incompatibleMeals(plan, OMNIVORE_2, DATASET)).toEqual([]);
    const missing = makePlan([makeMeal(0, 'dinner', 'disparue')]);
    expect(incompatibleMeals(missing, OMNIVORE_2, DATASET)).toHaveLength(1);
  });
});
