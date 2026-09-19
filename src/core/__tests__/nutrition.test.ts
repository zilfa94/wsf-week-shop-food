import { indexIngredients, indexRecipes } from '../dataset';
import {
  bmrMifflinStJeor,
  computeTarget,
  countDistinctVegetables,
  dailyMacros,
  dayScore,
  mealShares,
  nutritionPenalty,
  sumMacros,
  weekBalanceScore,
  weekNutrition,
} from '../nutrition';
import type { Macros } from '../types';
import { makeMeal, makePlan } from './fixtures/plans';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2 } from './fixtures/recipes';

const RECIPES = indexRecipes(FIXTURE_RECIPES);
const INGREDIENTS = indexIngredients(FIXTURE_INGREDIENTS);

describe('cibles', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmrMifflinStJeor({ sex: 'm', age: 30, heightCm: 180, weightKg: 75, activity: 'moderate' })).toBeCloseTo(1730, 0);
    expect(bmrMifflinStJeor({ sex: 'f', age: 30, heightCm: 165, weightKg: 60, activity: 'light' })).toBeCloseTo(1320, 0);
  });

  it('sans données corporelles : défauts par objectif et répartition des macros', () => {
    const t = computeTarget(OMNIVORE_2);
    expect(t.kcal).toBe(2000);
    expect(t.protein).toBe(100); // 20 % / 4
    expect(t.plannedKcal).toBe(1440); // 72 % couverts par les repas planifiés
    expect(t.plannedProtein).toBe(72);
    expect(t.carbs).toBe(250);
    expect(t.fat).toBe(67);
    expect(computeTarget({ ...OMNIVORE_2, goal: 'weight_loss' }).kcal).toBe(1700);
    expect(computeTarget({ ...OMNIVORE_2, goal: 'muscle_gain' }).kcal).toBe(2400);
  });

  it('avec données corporelles : activité et objectif appliqués, arrondi à 10', () => {
    const t = computeTarget({
      ...OMNIVORE_2,
      goal: 'weight_loss',
      body: { sex: 'm', age: 30, heightCm: 180, weightKg: 75, activity: 'moderate' },
    });
    expect(t.kcal).toBe(2280); // 1730 × 1,55 × 0,85 = 2279,3
  });

  it('plancher 1 200 (f) / 1 500 (m) en perte de poids', () => {
    const f = computeTarget({
      ...OMNIVORE_2,
      goal: 'weight_loss',
      body: { sex: 'f', age: 20, heightCm: 150, weightKg: 40, activity: 'sedentary' },
    });
    expect(f.kcal).toBe(1200);
    const m = computeTarget({
      ...OMNIVORE_2,
      goal: 'weight_loss',
      body: { sex: 'm', age: 20, heightCm: 150, weightKg: 45, activity: 'sedentary' },
    });
    expect(m.kcal).toBe(1500);
  });

  it('la répartition par repas somme exactement à kcal, avec ou sans collation / petit-déjeuner', () => {
    for (const p of [
      OMNIVORE_2,
      { ...OMNIVORE_2, includeSnack: true },
      { ...OMNIVORE_2, includeBreakfast: false },
      { ...OMNIVORE_2, includeBreakfast: false, includeSnack: true },
    ]) {
      const t = computeTarget(p);
      const sum = t.perMeal.breakfast + t.perMeal.lunch + t.perMeal.dinner + t.perMeal.snack;
      expect(sum).toBe(t.kcal);
      expect(t.perMeal.breakfast === 0).toBe(!p.includeBreakfast);
      expect(t.perMeal.snack === 0).toBe(!p.includeSnack);
    }
    expect(mealShares({ includeBreakfast: true, includeSnack: false })).toEqual({ breakfast: 0.25, lunch: 0.4, dinner: 0.35, snack: 0 });
  });
});

describe('macros journalières', () => {
  it('sumMacros et dailyMacros (7 jours, restes de batch comptés)', () => {
    const plan = makePlan([
      makeMeal(0, 'breakfast', 'omelette'),
      makeMeal(0, 'dinner', 'pates_poulet'),
      makeMeal(1, 'lunch', 'pates_poulet', { servings: 0, leftoverOf: '0-dinner' }),
    ]);
    const days = dailyMacros(plan, RECIPES);
    expect(days).toHaveLength(7);
    expect(days[0]!.kcal).toBe(1100);
    expect(days[1]!.kcal).toBe(550);
    expect(days[2]).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    expect(sumMacros([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  });

  it('ignore une recette inconnue sans planter', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'inconnue')]);
    expect(dailyMacros(plan, RECIPES)[0]!.kcal).toBe(0);
  });
});

describe('scores', () => {
  const target = computeTarget(OMNIVORE_2); // 2000 kcal/j dont 1440 attendus des repas planifiés, 72 g de protéines
  const perfect: Macros = { kcal: 1440, protein: 72, carbs: 180, fat: 48, fiber: 25 };

  it('dayScore : cible exacte → 100 ; +30 % kcal → ≤ 40 ; déficit protéines seul → 80', () => {
    expect(dayScore(perfect, target)).toBe(100);
    expect(dayScore({ ...perfect, kcal: 1872 }, target)).toBeLessThanOrEqual(40); // +30 %
    expect(dayScore({ ...perfect, protein: 50.4 }, target)).toBe(80); // −30 % de protéines
    expect(dayScore({ ...perfect, fiber: 0 }, target)).toBe(90);
  });

  it('nutritionPenalty : 0 dans la bande ±10 %, > 0 en dehors', () => {
    expect(nutritionPenalty([perfect, { ...perfect, kcal: 1550, protein: 65 }], target)).toBe(0);
    expect(nutritionPenalty([{ ...perfect, kcal: 1900 }], target)).toBeGreaterThan(0);
    expect(nutritionPenalty([{ ...perfect, fiber: 5 }], target)).toBeGreaterThan(0);
  });

  it('weekNutrition et weekBalanceScore bornés, bonus légumes plafonné à 5', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'curry_pois_chiches')]);
    const days = weekNutrition(plan, RECIPES, target);
    expect(days).toHaveLength(7);
    expect(days[0]!.day).toBe(0);
    for (const d of days) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
    const perfectDays = Array.from({ length: 7 }, (_, day) => ({ day: day as 0, macros: perfect, score: 100 }));
    expect(weekBalanceScore(perfectDays, 20)).toBe(100);
    const mediocre = perfectDays.map((d) => ({ ...d, score: 80 }));
    expect(weekBalanceScore(mediocre, 8)).toBe(80);
    expect(weekBalanceScore(mediocre, 10)).toBe(82);
    expect(weekBalanceScore(mediocre, 30)).toBe(85);
    expect(weekBalanceScore([], 0)).toBe(0);
  });

  it('countDistinctVegetables compte les ingrédients du rayon fruits & légumes', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'curry_pois_chiches')]);
    expect(countDistinctVegetables(plan, RECIPES, INGREDIENTS)).toBe(2); // tomate + coriandre
  });
});
