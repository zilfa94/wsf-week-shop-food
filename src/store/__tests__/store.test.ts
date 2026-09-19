import AsyncStorage from '@react-native-async-storage/async-storage';
import { itemKey } from '@/core/shopping';
import { DATASET } from '@/data';
import { partialize, STORE_KEY, useAppStore } from '../index';
import { migratePersisted, sanitizePlan, STORE_VERSION } from '../migrations';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../types';

const TODAY = '2026-09-19';

beforeEach(() => {
  useAppStore.getState().resetAll();
});

describe('plan', () => {
  it('generatePlan crée la semaine contenant today et purge l’état des anciens plans', () => {
    const s = useAppStore.getState();
    s.toggleChecked('ancien-plan', 'tomate');
    s.generatePlan({ today: TODAY });
    const plan = useAppStore.getState().currentPlan!;
    expect(plan.weekStart).toBe('2026-09-14');
    expect(plan.meals.length).toBeGreaterThan(0);
    expect(plan.unfilled).toEqual([]);
    expect(Object.keys(useAppStore.getState().checked)).toEqual([]);
  });

  it('regeneratePlan change la seed et conserve les repas verrouillés', () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    const first = useAppStore.getState().currentPlan!;
    s.toggleLock('2-dinner');
    s.regeneratePlan({ today: TODAY });
    const second = useAppStore.getState().currentPlan!;
    expect(second.seed).toBe(first.seed + 1);
    expect(second.meals.find((m) => m.id === '2-dinner')).toMatchObject({ recipeId: first.meals.find((m) => m.id === '2-dinner')!.recipeId, locked: true });
    expect(second.meals.map((m) => m.recipeId)).not.toEqual(first.meals.map((m) => m.recipeId));
  });

  it('swapMeal remplace et undoSwap revient en arrière', () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    const before = useAppStore.getState().currentPlan!;
    const used = new Set(before.meals.map((m) => m.recipeId));
    const candidate = DATASET.recipes.find((r) => r.mealTypes.includes('dinner') && !used.has(r.id) && r.prepMin + r.cookMin <= 90)!;
    s.swapMeal('5-dinner', candidate.id, TODAY);
    expect(useAppStore.getState().currentPlan!.meals.find((m) => m.id === '5-dinner')).toMatchObject({ recipeId: candidate.id, locked: true });
    expect(useAppStore.getState().previousPlan).toBe(before);
    s.undoSwap();
    expect(useAppStore.getState().currentPlan).toBe(before);
    expect(useAppStore.getState().previousPlan).toBeNull();
  });

  it('setCooked décompte le garde-manger une seule fois', () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    const meal = useAppStore.getState().currentPlan!.meals.find((m) => m.slot.type === 'dinner' && !m.leftoverOf)!;
    const recipe = DATASET.recipes.find((r) => r.id === meal.recipeId)!;
    const ing = recipe.ingredients.find((ri) => !DATASET.ingredients.find((i) => i.id === ri.ingredientId)!.staple)!;
    s.upsertPantryItem({ ingredientId: ing.ingredientId, quantity: 100000, addedAt: TODAY });
    s.setCooked(meal.id, true);
    const after = useAppStore.getState().pantry.find((p) => p.ingredientId === ing.ingredientId)!.quantity;
    expect(after).toBeLessThan(100000);
    s.setCooked(meal.id, true); // déjà cuisiné : pas de second décompte
    expect(useAppStore.getState().pantry.find((p) => p.ingredientId === ing.ingredientId)!.quantity).toBe(after);
    expect(useAppStore.getState().currentPlan!.meals.find((m) => m.id === meal.id)!.cooked).toBe(true);
  });

  it('startNextWeek avance d’une semaine (ou rattrape today) avec une nouvelle seed', () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    s.startNextWeek({ today: TODAY });
    expect(useAppStore.getState().currentPlan!.weekStart).toBe('2026-09-21');
    s.startNextWeek({ today: '2026-11-04' });
    expect(useAppStore.getState().currentPlan!.weekStart).toBe('2026-11-02');
  });
});

describe('courses et garde-manger', () => {
  it('toggleChecked, setPackChoice, articles libres', () => {
    const s = useAppStore.getState();
    s.toggleChecked('p1', 'tomate');
    s.toggleChecked('p1', 'tomate');
    s.toggleChecked('p1', 'oignon');
    s.setPackChoice('p1', 'oeuf', 1.7);
    s.addManualItem('p1', { label: 'Papier alu', aisle: 'other' });
    s.addManualItem('p1', { label: 'Éponges', aisle: 'other', price: 2 });
    const st = useAppStore.getState();
    expect(st.checked).toEqual({ [itemKey('p1', 'tomate')]: false, [itemKey('p1', 'oignon')]: true });
    expect(st.packChoices[itemKey('p1', 'oeuf')]).toBe(1);
    expect(st.manualItems['p1']!.map((m) => m.id)).toEqual(['m1', 'm2']);
    s.toggleManualItem('p1', 'm2');
    s.removeManualItem('p1', 'm1');
    expect(useAppStore.getState().manualItems['p1']).toEqual([{ id: 'm2', label: 'Éponges', aisle: 'other', price: 2, checked: true }]);
  });

  it('markHaveAlready et commitPurchasesToPantry alimentent le garde-manger', () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    const plan = useAppStore.getState().currentPlan!;
    s.markHaveAlready('riz', 500, TODAY);
    expect(useAppStore.getState().pantry).toContainEqual({ ingredientId: 'riz', quantity: 500, addedAt: TODAY });
    s.toggleChecked(plan.id, 'oignon');
    s.commitPurchasesToPantry(TODAY);
    const onion = useAppStore.getState().pantry.find((p) => p.ingredientId === 'oignon');
    expect(onion).toBeDefined();
    expect(onion!.expiresAt).toBeDefined();
    s.purgeExpired('2030-01-01');
    expect(useAppStore.getState().pantry.filter((p) => p.expiresAt)).toEqual([]);
  });

  it('upsertPantryItem et removePantryItem', () => {
    const s = useAppStore.getState();
    s.upsertPantryItem({ ingredientId: 'pates', quantity: 500, addedAt: TODAY });
    s.upsertPantryItem({ ingredientId: 'pates', quantity: 300, addedAt: TODAY });
    s.upsertPantryItem({ ingredientId: 'pates', quantity: 200, addedAt: '2026-09-01' });
    expect(useAppStore.getState().pantry.map((p) => p.quantity)).toEqual([300, 200]);
    s.removePantryItem('pates', '2026-09-01');
    expect(useAppStore.getState().pantry).toHaveLength(1);
    s.removePantryItem('pates');
    expect(useAppStore.getState().pantry).toHaveLength(0);
  });
});

describe('réglages, persistance, migrations', () => {
  it('setSetting, completeOnboarding, resetAll', () => {
    const s = useAppStore.getState();
    s.setSetting('themeMode', 'dark');
    s.completeOnboarding();
    s.setProfile({ persons: 4 });
    expect(useAppStore.getState().settings).toMatchObject({ themeMode: 'dark', hasOnboarded: true });
    expect(useAppStore.getState().profile.persons).toBe(4);
    s.resetAll();
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(useAppStore.getState().profile).toEqual(DEFAULT_PROFILE);
  });

  it('partialize n’écrit ni liste de courses ni previousPlan, et l’état est bien écrit dans AsyncStorage', async () => {
    const s = useAppStore.getState();
    s.generatePlan({ today: TODAY });
    const persisted = partialize(useAppStore.getState());
    expect(Object.keys(persisted).sort()).toEqual(['checked', 'currentPlan', 'manualItems', 'packChoices', 'pantry', 'profile', 'seed', 'settings']);
    await new Promise((r) => setTimeout(r, 0));
    const raw = await AsyncStorage.getItem(STORE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(STORE_VERSION);
    expect(parsed.state.currentPlan.id).toBe(useAppStore.getState().currentPlan!.id);
    expect(parsed.state.previousPlan).toBeUndefined();
  });

  it('migratePersisted complète les défauts et rejette un plan obsolète ou inconnu', () => {
    const migrated = migratePersisted({ profile: { persons: 3 }, seed: 9, pantry: 'oops' }, 0);
    expect(migrated.profile).toEqual({ ...DEFAULT_PROFILE, persons: 3 });
    expect(migrated.seed).toBe(9);
    expect(migrated.pantry).toEqual([]);
    expect(migrated.settings).toEqual(DEFAULT_SETTINGS);
    expect(migrated.currentPlan).toBeNull();
    const plan = useAppStore.getState().currentPlan ?? (useAppStore.getState().generatePlan({ today: TODAY }), useAppStore.getState().currentPlan!);
    expect(sanitizePlan(plan)).toBe(plan);
    expect(sanitizePlan({ ...plan, datasetVersion: 'autre' })).toBeNull();
    expect(sanitizePlan({ ...plan, meals: [{ ...plan.meals[0]!, recipeId: 'disparue' }] })).toBeNull();
    expect(migratePersisted(undefined, 0).currentPlan).toBeNull();
  });
});
