import { indexIngredients } from '../dataset';
import {
  candidatesForSlot,
  fitsSeason,
  fitsTime,
  isIngredientForbidden,
  isRecipeEligible,
  slotKey,
  slotsForProfile,
} from '../filter';
import { CHICKEN, CORIANDER, EGG, PASTA } from './fixtures/ingredients';
import {
  CHICKEN_PASTA,
  CHICKPEA_CURRY,
  FIXTURE_INGREDIENTS,
  FIXTURE_RECIPES,
  HONEY,
  HONEY_PANCAKES,
  MILK,
  OMELETTE,
  OMNIVORE_2,
  SALMON,
  SALMON_DISH,
  VEGAN_GF_1,
} from './fixtures/recipes';

const INGREDIENTS = indexIngredients(FIXTURE_INGREDIENTS);

describe('isIngredientForbidden : régimes dérivés de foodClass', () => {
  it('végétalien exclut viande, poisson, œufs, laitages et miel', () => {
    const p = { ...OMNIVORE_2, diet: 'vegan' as const };
    for (const ing of [CHICKEN, SALMON, EGG, MILK, HONEY]) expect(isIngredientForbidden(ing, p)).toBe(true);
    expect(isIngredientForbidden(PASTA, p)).toBe(false);
  });

  it('végétarien accepte œufs et laitages, refuse viande et poisson', () => {
    const p = { ...OMNIVORE_2, diet: 'vegetarian' as const };
    expect(isIngredientForbidden(EGG, p)).toBe(false);
    expect(isIngredientForbidden(MILK, p)).toBe(false);
    expect(isIngredientForbidden(CHICKEN, p)).toBe(true);
    expect(isIngredientForbidden(SALMON, p)).toBe(true);
  });

  it('pescétarien accepte le poisson, refuse la volaille ; sans porc accepte la volaille', () => {
    expect(isIngredientForbidden(SALMON, { ...OMNIVORE_2, diet: 'pescatarian' })).toBe(false);
    expect(isIngredientForbidden(CHICKEN, { ...OMNIVORE_2, diet: 'pescatarian' })).toBe(true);
    expect(isIngredientForbidden(CHICKEN, { ...OMNIVORE_2, diet: 'no_pork' })).toBe(false);
  });

  it('allergènes et aversions', () => {
    expect(isIngredientForbidden(PASTA, { ...OMNIVORE_2, allergens: ['gluten'] })).toBe(true);
    expect(isIngredientForbidden(CORIANDER, { ...OMNIVORE_2, dislikedIngredientIds: ['coriandre'] })).toBe(true);
    expect(isIngredientForbidden(CORIANDER, OMNIVORE_2)).toBe(false);
  });
});

describe('isRecipeEligible', () => {
  it('un ingrédient optionnel interdit n’exclut pas la recette', () => {
    // coriandre optionnelle dans les pâtes au poulet
    expect(isRecipeEligible(CHICKEN_PASTA, { ...OMNIVORE_2, dislikedIngredientIds: ['coriandre'] }, INGREDIENTS)).toBe(true);
    // lait optionnel dans l'omelette → éligible pour un allergique au lait
    expect(isRecipeEligible(OMELETTE, { ...OMNIVORE_2, allergens: ['milk'] }, INGREDIENTS)).toBe(true);
  });

  it('un ingrédient obligatoire interdit exclut la recette', () => {
    expect(isRecipeEligible(CHICKEN_PASTA, VEGAN_GF_1, INGREDIENTS)).toBe(false);
    expect(isRecipeEligible(CHICKPEA_CURRY, VEGAN_GF_1, INGREDIENTS)).toBe(true);
    expect(isRecipeEligible(HONEY_PANCAKES, { ...OMNIVORE_2, diet: 'vegan' }, INGREDIENTS)).toBe(false);
  });

  it('ingrédient inconnu → inéligible', () => {
    const r = { ...OMELETTE, ingredients: [{ ingredientId: 'inconnu', quantity: 1, unit: 'g' as const }] };
    expect(isRecipeEligible(r, OMNIVORE_2, INGREDIENTS)).toBe(false);
  });
});

describe('temps, saison, créneaux', () => {
  it('fitsTime : 55 min passe le samedi (90) mais pas le mardi (30)', () => {
    expect(fitsTime(CHICKPEA_CURRY, 5, OMNIVORE_2)).toBe(true);
    expect(fitsTime(CHICKPEA_CURRY, 1, OMNIVORE_2)).toBe(false);
    expect(fitsTime(OMELETTE, 1, OMNIVORE_2)).toBe(true);
  });

  it('fitsSeason : [] = toute l’année', () => {
    expect(fitsSeason(OMELETTE, 'summer')).toBe(true);
    expect(fitsSeason(SALMON_DISH, 'summer')).toBe(false);
    expect(fitsSeason(SALMON_DISH, 'winter')).toBe(true);
  });

  it('candidatesForSlot combine toutes les contraintes', () => {
    const tuesdayDinner = candidatesForSlot(FIXTURE_RECIPES, { day: 1, type: 'dinner' }, OMNIVORE_2, INGREDIENTS, 'summer');
    expect(tuesdayDinner.map((r) => r.id).sort()).toEqual(['omelette', 'pates_poulet']);
    const saturdayDinnerWinter = candidatesForSlot(FIXTURE_RECIPES, { day: 5, type: 'dinner' }, OMNIVORE_2, INGREDIENTS, 'winter');
    expect(saturdayDinnerWinter.map((r) => r.id).sort()).toEqual(['curry_pois_chiches', 'omelette', 'pates_poulet', 'saumon_poele']);
    // curry = 55 min : refusé en semaine (45 min max pour ce profil), accepté le samedi (60 min)
    expect(candidatesForSlot(FIXTURE_RECIPES, { day: 2, type: 'lunch' }, VEGAN_GF_1, INGREDIENTS, 'summer')).toEqual([]);
    const veganSaturdayLunch = candidatesForSlot(FIXTURE_RECIPES, { day: 5, type: 'lunch' }, VEGAN_GF_1, INGREDIENTS, 'summer');
    expect(veganSaturdayLunch.map((r) => r.id)).toEqual(['curry_pois_chiches']);
  });

  it('slotsForProfile : 7 × (pdj ? + déj + dîner + collation ?)', () => {
    expect(slotsForProfile(OMNIVORE_2)).toHaveLength(21);
    expect(slotsForProfile({ includeBreakfast: false, includeLunch: true, includeDinner: true, includeSnack: false })).toHaveLength(14);
    expect(slotsForProfile({ includeBreakfast: true, includeLunch: true, includeDinner: true, includeSnack: true })).toHaveLength(28);
    expect(slotsForProfile({ includeBreakfast: false, includeLunch: false, includeDinner: true, includeSnack: false })).toHaveLength(7); // un seul repas par jour
    expect(slotsForProfile({ includeBreakfast: false, includeLunch: false, includeDinner: false, includeSnack: false })).toHaveLength(14); // repli déjeuner + dîner
    expect(slotsForProfile(OMNIVORE_2)[0]).toEqual({ day: 0, type: 'breakfast' });
  });

  it('slotKey est stable', () => {
    expect(slotKey({ day: 3, type: 'lunch' })).toBe('3-lunch');
  });
});
