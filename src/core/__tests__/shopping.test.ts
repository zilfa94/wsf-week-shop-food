import { AISLE_ORDER } from '../aisles';
import {
  addPurchasesToPantry,
  buildShoppingList,
  consumeFromPantry,
  diffShoppingLists,
  itemKey,
  pantryAvailable,
  wasteScore,
  type BuildShoppingListArgs,
} from '../shopping';
import type { ManualItem, PantryItem, ShoppingList, UserProfile, WeekPlan } from '../types';
import { makeMeal, makePlan } from './fixtures/plans';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, OMNIVORE_2 } from './fixtures/recipes';

const DATASET = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };

function build(plan: WeekPlan, over: Partial<BuildShoppingListArgs> = {}): ShoppingList {
  return buildShoppingList({
    plan,
    dataset: DATASET,
    profile: plan.profileSnapshot,
    pantry: [],
    checked: {},
    packChoices: {},
    manualItems: [],
    ...over,
  });
}

const item = (list: ShoppingList, id: string) => list.items.find((i) => i.ingredientId === id);

describe('agrégation et mise à l’échelle', () => {
  it('met la recette à l’échelle des portions du repas', () => {
    // pâtes au poulet : 200 g de pâtes pour 2 portions
    const one = build(makePlan([makeMeal(0, 'dinner', 'pates_poulet', { servings: 1 })]));
    expect(item(one, 'pates_penne')).toMatchObject({ needed: 100, packs: 1, bought: 500, leftover: 400 });
    const six = build(makePlan([makeMeal(0, 'dinner', 'pates_poulet', { servings: 6 })]));
    expect(item(six, 'pates_penne')).toMatchObject({ needed: 600, packs: 2, bought: 1000, leftover: 400 });
  });

  it('additionne des unités différentes après conversion (2 c. à s. + 1 c. à c. d’huile = 35 ml)', () => {
    const profile: UserProfile = { ...OMNIVORE_2, assumeStaples: false };
    const list = build(makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'omelette')], profile));
    expect(item(list, 'huile_olive')).toMatchObject({ needed: 35, packs: 1, bought: 750 });
    expect(list.items.filter((i) => i.ingredientId === 'huile_olive')).toHaveLength(1);
  });

  it('ignore les repas « restes » et compte le dîner source doublé', () => {
    const plan = makePlan([
      makeMeal(0, 'dinner', 'pates_poulet', { servings: 4 }),
      makeMeal(1, 'lunch', 'pates_poulet', { servings: 0, leftoverOf: '0-dinner' }),
    ]);
    const list = build(plan);
    expect(item(list, 'pates_penne')!.needed).toBe(400);
    expect(item(list, 'pates_penne')!.usedIn).toHaveLength(1);
  });

  it('staples : absents de la liste mais rappelés, sauf si assumeStaples est faux', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const assumed = build(plan);
    expect(item(assumed, 'huile_olive')).toBeUndefined();
    expect(assumed.staplesToCheck).toEqual(['huile_olive']);
    const listed = build(plan, { profile: { ...OMNIVORE_2, assumeStaples: false } });
    expect(item(listed, 'huile_olive')).toBeDefined();
    expect(listed.staplesToCheck).toEqual([]);
  });

  it('un ingrédient optionnel interdit est retiré ; autorisé, il est listé', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'omelette')]);
    expect(item(build(plan), 'lait')).toBeDefined();
    expect(item(build(plan, { profile: { ...OMNIVORE_2, allergens: ['milk'] } }), 'lait')).toBeUndefined();
  });
});

describe('garde-manger', () => {
  const plan = makePlan([makeMeal(3, 'dinner', 'pates_poulet')]); // premier usage jeudi 17/09

  it('déduit un stock partiel', () => {
    const pantry: PantryItem[] = [{ ingredientId: 'pates_penne', quantity: 150, addedAt: '2026-09-01' }];
    expect(item(build(plan, { pantry }), 'pates_penne')).toMatchObject({ needed: 200, fromPantry: 150, toBuyExact: 50, packs: 1 });
  });

  it('ignore un stock périmé avant le premier usage et additionne les lignes valides', () => {
    const pantry: PantryItem[] = [
      { ingredientId: 'pates_penne', quantity: 100, addedAt: '2026-09-01', expiresAt: '2026-09-16' }, // périmé la veille
      { ingredientId: 'pates_penne', quantity: 120, addedAt: '2026-09-01', expiresAt: '2026-09-17' }, // valide le jour même
      { ingredientId: 'pates_penne', quantity: 130, addedAt: '2026-09-02' },
    ];
    expect(pantryAvailable(pantry, 'pates_penne', '2026-09-17')).toBe(250);
    expect(item(build(plan, { pantry }), 'pates_penne')).toMatchObject({ fromPantry: 200, toBuyExact: 0, packs: 0, price: 0 });
  });

  it('un article entièrement couvert reste dans items mais pas dans les sections', () => {
    const pantry: PantryItem[] = [{ ingredientId: 'pates_penne', quantity: 1000, addedAt: '2026-09-01' }];
    const list = build(plan, { pantry });
    expect(item(list, 'pates_penne')!.packs).toBe(0);
    expect(list.sections.flatMap((s) => s.items).some((i) => i.ingredientId === 'pates_penne')).toBe(false);
  });
});

describe('sections, totaux, état', () => {
  const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'breakfast', 'omelette'), makeMeal(2, 'dinner', 'curry_pois_chiches')]);

  it('sections dans l’ordre de parcours, sans section vide, articles triés par nom', () => {
    const list = build(plan);
    const ranks = list.sections.map((s) => AISLE_ORDER.indexOf(s.aisle));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    for (const s of list.sections) expect(s.items.length + s.manualItems.length).toBeGreaterThan(0);
    expect(list.sections[0]!.aisle).toBe('fruits_vegetables');
    expect(list.sections[0]!.items.map((i) => i.ingredientId)).toEqual(['coriandre', 'tomate']);
  });

  it('totalPrice = Σ prix (+ articles libres), totalLeftoverValue cohérent, wasteScore borné', () => {
    const manual: ManualItem[] = [{ id: 'm1', label: 'Papier alu', aisle: 'other', price: 2.5, checked: false }];
    const list = build(plan, { manualItems: manual });
    const expected = list.items.reduce((s, i) => s + i.price, 0) + 2.5;
    expect(list.totalPrice).toBeCloseTo(expected, 2);
    expect(list.totalLeftoverValue).toBeGreaterThan(0);
    expect(list.wasteScore).toBeGreaterThanOrEqual(0);
    expect(list.wasteScore).toBeLessThanOrEqual(100);
    expect(list.sections.find((s) => s.aisle === 'other')!.manualItems).toEqual(manual);
    expect(wasteScore([])).toBe(100);
  });

  it('conserve les cases cochées et le choix de conditionnement', () => {
    const list = build(plan, {
      checked: { [itemKey(plan.id, 'tomate')]: true },
      packChoices: { [itemKey(plan.id, 'oeuf')]: 1, [itemKey(plan.id, 'tomate')]: 9 },
    });
    expect(item(list, 'tomate')!.checked).toBe(true);
    expect(item(list, 'coriandre')!.checked).toBe(false);
    expect(item(list, 'oeuf')).toMatchObject({ packagingIndex: 1, packaging: { size: 12 }, packs: 1, bought: 12, leftover: 8 });
    expect(item(list, 'tomate')!.packagingIndex).toBe(0); // index hors bornes ramené au défaut
  });

  it('usedIn et firstUseDay', () => {
    const list = build(makePlan([makeMeal(4, 'dinner', 'pates_poulet'), makeMeal(2, 'dinner', 'curry_pois_chiches')]));
    const tomato = item(list, 'tomate')!;
    expect(tomato.firstUseDay).toBe(2);
    expect(tomato.usedIn.map((u) => u.mealId).sort()).toEqual(['2-dinner', '4-dinner']);
    expect(tomato.needed).toBe(7 * 120);
  });

  it('diffShoppingLists compte les articles à acheter et le prix', () => {
    const before = build(makePlan([makeMeal(0, 'dinner', 'pates_poulet')]));
    const after = build(makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'saumon_poele')]));
    const d = diffShoppingLists(before, after);
    expect(d.deltaItems).toBe(1);
    expect(d.deltaPrice).toBeCloseTo(7.5, 2); // 250 g de saumon → 300 g de vrac à 2,50 €/100 g
  });
});

describe('après les courses et après cuisine', () => {
  it('addPurchasesToPantry ajoute les articles cochés avec leur date limite', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const list = build(plan, { checked: { [itemKey(plan.id, 'pates_penne')]: true, [itemKey(plan.id, 'coriandre')]: true } });
    const pantry = addPurchasesToPantry([], list, '2026-09-13', FIXTURE_INGREDIENTS);
    expect(pantry).toEqual([
      { ingredientId: 'coriandre', quantity: 30, addedAt: '2026-09-13', expiresAt: '2026-09-17' },
      { ingredientId: 'pates_penne', quantity: 500, addedAt: '2026-09-13', expiresAt: '2027-09-13' },
    ]);
  });

  it('consumeFromPantry décompte FIFO par date limite et supprime les lignes vides', () => {
    const pantry: PantryItem[] = [
      { ingredientId: 'pates_penne', quantity: 300, addedAt: '2026-09-10', expiresAt: '2027-01-01' },
      { ingredientId: 'pates_penne', quantity: 300, addedAt: '2026-09-01', expiresAt: '2026-12-01' },
      { ingredientId: 'oeuf', quantity: 6, addedAt: '2026-09-01' },
    ];
    const out = consumeFromPantry(pantry, new Map([['pates_penne', 400], ['oeuf', 10]]));
    expect(out).toEqual([{ ingredientId: 'pates_penne', quantity: 200, addedAt: '2026-09-10', expiresAt: '2027-01-01' }]);
  });
});
