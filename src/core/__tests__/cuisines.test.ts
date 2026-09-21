import { cuisineFamily, isOutsidePreferences, preferredFamilies, selectableCuisines } from '../cuisines';
import { profileDrift } from '../plan-edit';
import type { Cuisine, Recipe } from '../types';
import { makePlan } from './fixtures/plans';
import { makeRecipe, OMNIVORE_2 } from './fixtures/recipes';

const main = (id: string, cuisine: Cuisine): Recipe => makeRecipe({ id, ingredients: [], cuisine, mealTypes: ['lunch', 'dinner'] });
const breakfast = (id: string, cuisine: Cuisine): Recipe => makeRecipe({ id, ingredients: [], cuisine, mealTypes: ['breakfast'] });

describe('cuisines préférées', () => {
  it('rattache les cuisines rares à une famille voisine', () => {
    expect(cuisineFamily('italian')).toBe('mediterranean');
    expect(cuisineFamily('indian')).toBe('asian');
    expect(cuisineFamily('french')).toBe('french');
    expect(cuisineFamily('mexican')).toBe('other');
    expect([...preferredFamilies(['italian', 'mediterranean', 'other', 'asian'])]).toEqual(['mediterranean', 'asian']);
  });

  it('ne propose que les familles assez fournies en déjeuners / dîners, jamais « autre »', () => {
    const recipes = [
      ...Array.from({ length: 6 }, (_, i) => main(`fr${i}`, 'french')),
      ...Array.from({ length: 4 }, (_, i) => main(`med${i}`, 'mediterranean')),
      main('it1', 'italian'),
      main('in1', 'indian'),
      main('mx1', 'mexican'),
      ...Array.from({ length: 9 }, (_, i) => breakfast(`b${i}`, 'french')),
    ];
    expect(selectableCuisines(recipes, 5)).toEqual([
      { cuisine: 'french', count: 6 },
      { cuisine: 'mediterranean', count: 5 },
    ]);
    expect(selectableCuisines(recipes, 1).map((c) => c.cuisine)).toEqual(['french', 'mediterranean', 'asian']);
  });

  it('un plat hors préférences n’est signalé que pour un déjeuner / dîner et si des préférences existent', () => {
    const fam = preferredFamilies(['asian']);
    expect(isOutsidePreferences(main('x', 'french'), fam)).toBe(true);
    expect(isOutsidePreferences(main('x', 'indian'), fam)).toBe(false);
    expect(isOutsidePreferences(main('x', 'french'), fam, 'breakfast')).toBe(false);
    expect(isOutsidePreferences(main('x', 'french'), fam, 'dinner')).toBe(true);
    expect(isOutsidePreferences(main('x', 'french'), preferredFamilies([]))).toBe(false);
  });

  it('changer ses cuisines préférées est une dérive de profil', () => {
    const plan = makePlan([]);
    expect(profileDrift(plan, plan.profileSnapshot)).toEqual([]);
    expect(profileDrift(plan, { ...plan.profileSnapshot, preferredCuisines: ['asian'] })).toEqual(['cuisines']);
    expect(profileDrift({ ...plan, profileSnapshot: { ...OMNIVORE_2, preferredCuisines: ['asian', 'french'] } }, { ...OMNIVORE_2, preferredCuisines: ['french', 'asian'] })).toEqual([]);
  });
});
