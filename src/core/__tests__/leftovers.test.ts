import { indexIngredients } from '../dataset';
import { cookWithPantry, isNotableLeftover, recipeFeasibility, suggestLeftoverUses } from '../leftovers';
import { buildShoppingList } from '../shopping';
import type { PantryItem, ShoppingItem, WeekPlan } from '../types';
import { makeMeal, makePlan } from './fixtures/plans';
import { CHICKEN_PASTA, FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2 } from './fixtures/recipes';

const DATASET = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };
const INGREDIENTS = indexIngredients(FIXTURE_INGREDIENTS);

function listFor(plan: WeekPlan, pantry: PantryItem[] = []) {
  return buildShoppingList({ plan, dataset: DATASET, profile: plan.profileSnapshot, pantry, checked: {}, packChoices: {}, manualItems: [] });
}

const fakeItem = (over: Partial<ShoppingItem>): ShoppingItem => ({
  ingredientId: 'x',
  aisle: 'other',
  needed: 0,
  fromPantry: 0,
  toBuyExact: 0,
  packaging: { kind: 'pack', size: 500, price: 1, label: 'p' },
  packagingIndex: 0,
  packs: 1,
  bought: 500,
  leftover: 0,
  leftoverValue: 0,
  price: 1,
  label: 'p',
  usedIn: [],
  firstUseDay: 0,
  checked: false,
  ...over,
});

describe('seuils', () => {
  it('120 g de pâtes sur 500 → signalé par le ratio ; 10 g de coriandre à 0,30 € → par la valeur ; staple jamais', () => {
    expect(isNotableLeftover(fakeItem({ leftover: 120, leftoverValue: 0.01 }), false)).toBe(true);
    expect(isNotableLeftover(fakeItem({ leftover: 50, leftoverValue: 0.01 }), false)).toBe(false);
    expect(isNotableLeftover(fakeItem({ leftover: 10, leftoverValue: 0.3, packaging: { kind: 'pack', size: 30, price: 0.9, label: 'botte' } }), false)).toBe(true);
    expect(isNotableLeftover(fakeItem({ leftover: 400, leftoverValue: 5 }), true)).toBe(false);
    expect(isNotableLeftover(fakeItem({ leftover: 0 }), false)).toBe(false);
  });
});

describe('suggestLeftoverUses', () => {
  it('propose des recettes hors plan qui absorbent le reste, les plus chers d’abord', () => {
    // pâtes au poulet seules : reste 300 g de pâtes, 15 g de coriandre (optionnelle, autorisée), 40 g de poulet, 40 g de tomates
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const list = listFor(plan);
    const suggestions = suggestLeftoverUses({ items: list.items, plan, dataset: DATASET, profile: OMNIVORE_2, pantry: [] });
    expect(suggestions.length).toBeGreaterThan(0);
    for (let i = 1; i < suggestions.length; i++) expect(suggestions[i - 1]!.leftoverValue).toBeGreaterThanOrEqual(suggestions[i]!.leftoverValue);
    const coriander = suggestions.find((s) => s.ingredientId === 'coriandre')!;
    expect(coriander.recipes.map((r) => r.recipeId)).toContain('curry_pois_chiches');
    expect(coriander.recipes.map((r) => r.recipeId)).not.toContain('pates_poulet'); // déjà dans le plan
    expect(coriander.freezable).toBe(false);
    expect(coriander.reusedByMealId).toBeUndefined();
    const chicken = suggestions.find((s) => s.ingredientId === 'poulet_blanc');
    if (chicken) expect(chicken.freezable).toBe(true);
    // les suggestions sont intégrées à la liste
    expect(list.leftovers.map((s) => s.ingredientId)).toEqual(suggestions.map((s) => s.ingredientId));
  });

  it('signale le repas ultérieur qui réutilise le pack', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(3, 'dinner', 'curry_pois_chiches')]);
    const list = listFor(plan);
    const tomato = list.leftovers.find((s) => s.ingredientId === 'tomate');
    // 7 tomates = 840 g → 900 g de vrac : reste 60 g (ratio 60 %) réutilisé jeudi
    expect(tomato?.reusedByMealId).toBe('3-dinner');
  });

  it('exclut les recettes inéligibles au régime', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'curry_pois_chiches')], { ...OMNIVORE_2, diet: 'vegan' });
    const list = listFor(plan);
    for (const s of list.leftovers) {
      expect(s.recipes.map((r) => r.recipeId)).not.toContain('pates_poulet');
      expect(s.recipes.map((r) => r.recipeId)).not.toContain('omelette');
    }
  });

  it('une recette qui n’exige aucun achat supplémentaire est mieux classée', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const list = listFor(plan);
    // garde-manger complet pour le curry : il ne coûte rien de plus
    const pantry: PantryItem[] = [
      { ingredientId: 'pois_chiches', quantity: 600, addedAt: '2026-09-01' },
      { ingredientId: 'tomate', quantity: 1000, addedAt: '2026-09-01' },
    ];
    const withPantry = suggestLeftoverUses({ items: list.items, plan, dataset: DATASET, profile: OMNIVORE_2, pantry });
    const coriander = withPantry.find((s) => s.ingredientId === 'coriandre')!;
    expect(coriander.recipes[0]!.recipeId).toBe('curry_pois_chiches');
    // il ne manque que la demi-botte de coriandre (le curry en veut une entière) : 0,90 €
    expect(coriander.recipes[0]!.extraCost).toBeCloseTo(0.9, 2);
    expect(coriander.recipes[0]!.coversValue).toBeGreaterThan(0);
    const without = suggestLeftoverUses({ items: list.items, plan, dataset: DATASET, profile: OMNIVORE_2, pantry: [] });
    expect(without.find((s) => s.ingredientId === 'coriandre')!.recipes[0]!.extraCost).toBeGreaterThan(0.9);
  });
});

describe('cuisiner avec ce que j’ai', () => {
  const pantry: PantryItem[] = [
    { ingredientId: 'pates_penne', quantity: 500, addedAt: '2026-09-01' },
    { ingredientId: 'poulet_blanc', quantity: 300, addedAt: '2026-09-01' },
    { ingredientId: 'tomate', quantity: 200, addedAt: '2026-09-01' },
  ];

  it('recipeFeasibility : ratio en valeur et manquants', () => {
    const f = recipeFeasibility(CHICKEN_PASTA, pantry, INGREDIENTS, OMNIVORE_2, 2);
    expect(f.ratio).toBeGreaterThan(0.8);
    expect(f.ratio).toBeLessThan(1);
    expect(f.missing.map((m) => m.ingredientId).sort()).toEqual(['coriandre', 'tomate']);
    expect(f.missing.find((m) => m.ingredientId === 'tomate')!.quantity).toBe(160);
    expect(recipeFeasibility(CHICKEN_PASTA, [], INGREDIENTS, OMNIVORE_2, 2).ratio).toBe(0);
  });

  it('cookWithPantry trie par faisabilité et applique le seuil', () => {
    const all = cookWithPantry(DATASET, pantry, OMNIVORE_2, 0);
    expect(all[0]!.recipeId).toBe('pates_poulet');
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.ratio).toBeGreaterThanOrEqual(all[i]!.ratio);
    const feasible = cookWithPantry(DATASET, pantry, OMNIVORE_2);
    expect(feasible.map((f) => f.recipeId)).toEqual(['pates_poulet']);
    expect(cookWithPantry(DATASET, pantry, { ...OMNIVORE_2, diet: 'vegan' })).toEqual([]);
  });

  it('un stock périmé à la date donnée n’est pas compté', () => {
    const expired: PantryItem[] = [{ ingredientId: 'pates_penne', quantity: 500, addedAt: '2026-09-01', expiresAt: '2026-09-10' }];
    expect(recipeFeasibility(CHICKEN_PASTA, expired, INGREDIENTS, OMNIVORE_2, 2, '2026-09-12').ratio).toBe(0);
    expect(recipeFeasibility(CHICKEN_PASTA, expired, INGREDIENTS, OMNIVORE_2, 2, '2026-09-09').ratio).toBeGreaterThan(0);
  });
});
