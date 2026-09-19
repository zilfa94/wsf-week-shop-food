import {
  AISLE_LABELS,
  ALLERGEN_LABELS,
  CUISINE_LABELS,
  MEAL_TYPE_LABELS,
  MONTH_SHORT_LABELS,
  ONBOARDING_ALLERGENS,
  UNIT_LABELS,
  WEEKDAY_LABELS,
  unitLabel,
} from '../labels';
import { DEFAULT_PLANNER_PARAMS, resolvePlannerParams } from '../params';

describe('labels', () => {
  it('aucun libellé vide', () => {
    for (const table of [AISLE_LABELS, ALLERGEN_LABELS, CUISINE_LABELS, MEAL_TYPE_LABELS, UNIT_LABELS, WEEKDAY_LABELS]) {
      for (const [key, label] of Object.entries(table)) {
        expect(typeof label).toBe('string');
        expect(label.trim().length).toBeGreaterThan(0);
        expect(key.length).toBeGreaterThan(0);
      }
    }
    expect(MONTH_SHORT_LABELS).toHaveLength(12);
  });

  it('les allergènes de l’onboarding existent tous', () => {
    for (const a of ONBOARDING_ALLERGENS) expect(ALLERGEN_LABELS[a]).toBeDefined();
    expect(new Set(ONBOARDING_ALLERGENS).size).toBe(ONBOARDING_ALLERGENS.length);
  });

  it('unitLabel accorde les unités comptables', () => {
    expect(unitLabel('clove', 1)).toBe('gousse');
    expect(unitLabel('clove', 2)).toBe('gousses');
    expect(unitLabel('g', 200)).toBe('g');
    expect(unitLabel('tbsp', 3)).toBe('c. à s.');
  });
});

describe('params', () => {
  it('resolvePlannerParams renvoie les défauts sans surcharge', () => {
    expect(resolvePlannerParams()).toBe(DEFAULT_PLANNER_PARAMS);
  });

  it('fusionne en profondeur une surcharge partielle', () => {
    const p = resolvePlannerParams({ anneal: { iterations: 10 }, weights: { waste: 2 } });
    expect(p.anneal).toEqual({ iterations: 10, t0: 2, tEnd: 0.02 });
    expect(p.weights).toEqual({ waste: 2, variety: 1.5, nutrition: 8, budget: 0 });
    expect(p.greedyTopK).toBe(3);
    expect(p.batchBonus).toBe(2);
    expect(DEFAULT_PLANNER_PARAMS.anneal.iterations).toBe(4000); // défauts non mutés
  });
});
