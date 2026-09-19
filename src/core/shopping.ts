/**
 * Liste de courses DÉRIVÉE du plan et du garde-manger : agrégation multi-unités, déduction du
 * stock non périmé à la date du premier usage, arrondi aux conditionnements, prix, restes,
 * sections par rayon, score anti-gaspillage. Voir docs/SPEC.md § 4.4.
 */
import { aisleRank } from './aisles';
import { addDays } from './date';
import { indexIngredients, indexRecipes } from './dataset';
import { suggestLeftoverUses } from './leftovers';
import { recipeNeeds } from './needs';
import { EPS, formatPacks, packagingsOf, perishFactor, roundToPackaging, unitPrice } from './packaging';
import type {
  AisleSection,
  Dataset,
  ISODate,
  IngredientId,
  IngredientUse,
  ManualItem,
  PantryItem,
  ShoppingItem,
  ShoppingList,
  UserProfile,
  WeekPlan,
  Weekday,
} from './types';

export { recipeNeeds } from './needs';

/** Clé d'état persisté (coché, choix de pack) pour un article d'un plan. */
export function itemKey(planId: string, ingredientId: IngredientId): string {
  return `${planId}:${ingredientId}`;
}

/** Quantité du garde-manger utilisable : lignes non périmées à la date d'usage. */
export function pantryAvailable(pantry: readonly PantryItem[], ingredientId: IngredientId, useDate: ISODate): number {
  let total = 0;
  for (const p of pantry) {
    if (p.ingredientId !== ingredientId) continue;
    if (p.expiresAt && p.expiresAt < useDate) continue;
    total += p.quantity;
  }
  return total;
}

export interface BuildShoppingListArgs {
  readonly plan: WeekPlan;
  readonly dataset: Dataset;
  readonly profile: UserProfile;
  readonly pantry: readonly PantryItem[];
  /** `itemKey` → coché. */
  readonly checked: Readonly<Record<string, boolean>>;
  /** `itemKey` → index dans `packagingsOf(ingredient)`. */
  readonly packChoices: Readonly<Record<string, number>>;
  readonly manualItems: readonly ManualItem[];
}

interface Accumulator {
  needed: number;
  usedIn: IngredientUse[];
  firstUseDay: Weekday;
}

export function buildShoppingList(args: BuildShoppingListArgs): ShoppingList {
  const { plan, dataset, profile, pantry } = args;
  const ingredients = indexIngredients(dataset.ingredients);
  const recipes = indexRecipes(dataset.recipes);

  // 1) agrégation des besoins (les repas « restes » n'achètent rien : leur source est déjà doublée)
  const acc = new Map<IngredientId, Accumulator>();
  for (const meal of plan.meals) {
    if (meal.leftoverOf || meal.servings <= 0) continue;
    const recipe = recipes.get(meal.recipeId);
    if (!recipe) continue;
    for (const [ingId, qty] of recipeNeeds(recipe, meal.servings, ingredients, profile)) {
      const e = acc.get(ingId) ?? { needed: 0, usedIn: [], firstUseDay: 6 };
      e.needed += qty;
      e.usedIn.push({ mealId: meal.id, recipeId: recipe.id, quantity: qty });
      if (meal.slot.day < e.firstUseDay) e.firstUseDay = meal.slot.day;
      acc.set(ingId, e);
    }
  }

  // 2) garde-manger, conditionnement, prix
  const items: ShoppingItem[] = [];
  const staplesToCheck: IngredientId[] = [];
  for (const [ingId, e] of acc) {
    const ing = ingredients.get(ingId)!;
    if (ing.staple && profile.assumeStaples) {
      staplesToCheck.push(ingId);
      continue;
    }
    const key = itemKey(plan.id, ingId);
    const usable = pantryAvailable(pantry, ingId, addDays(plan.weekStart, e.firstUseDay));
    const fromPantry = Math.min(usable, e.needed);
    const toBuyExact = Math.max(0, e.needed - fromPantry);
    const options = packagingsOf(ing);
    const packagingIndex = Math.min(Math.max(0, args.packChoices[key] ?? 0), options.length - 1);
    const packaging = options[packagingIndex]!;
    const { packs, bought } = roundToPackaging(packaging, toBuyExact);
    const leftover = Math.max(0, bought - toBuyExact);
    items.push({
      ingredientId: ingId,
      aisle: ing.aisle,
      needed: e.needed,
      fromPantry,
      toBuyExact,
      packaging,
      packagingIndex,
      packs,
      bought,
      leftover,
      leftoverValue: leftover * unitPrice(packaging) * perishFactor(ing),
      price: packs * packaging.price,
      label: formatPacks(ing, packaging, packs),
      usedIn: e.usedIn,
      firstUseDay: e.firstUseDay,
      checked: args.checked[key] ?? false,
    });
  }
  items.sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || nameOf(a.ingredientId).localeCompare(nameOf(b.ingredientId)));
  staplesToCheck.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  function nameOf(id: IngredientId): string {
    return ingredients.get(id)?.name ?? id;
  }

  // 3) sections dans l'ordre de parcours (articles à acheter + articles libres)
  const sections: AisleSection[] = [];
  const byAisle = new Map<string, { items: ShoppingItem[]; manualItems: ManualItem[] }>();
  for (const it of items) {
    if (it.packs === 0) continue;
    const s = byAisle.get(it.aisle) ?? { items: [], manualItems: [] };
    s.items.push(it);
    byAisle.set(it.aisle, s);
  }
  for (const m of args.manualItems) {
    const s = byAisle.get(m.aisle) ?? { items: [], manualItems: [] };
    s.manualItems.push(m);
    byAisle.set(m.aisle, s);
  }
  for (const [aisle, s] of [...byAisle.entries()].sort((a, b) => aisleRank(a[0] as ShoppingItem['aisle']) - aisleRank(b[0] as ShoppingItem['aisle']))) {
    sections.push({ aisle: aisle as ShoppingItem['aisle'], items: s.items, manualItems: s.manualItems });
  }

  const totalPrice = round2(items.reduce((s, i) => s + i.price, 0) + args.manualItems.reduce((s, m) => s + (m.price ?? 0), 0));
  const totalLeftoverValue = round2(items.reduce((s, i) => s + i.leftoverValue, 0));

  return {
    planId: plan.id,
    items,
    sections,
    manualItems: args.manualItems,
    totalPrice,
    totalLeftoverValue,
    staplesToCheck,
    wasteScore: wasteScore(items),
    leftovers: suggestLeftoverUses({ items, plan, dataset, profile, pantry }),
  };
}

/** Score anti-gaspillage 0..100 : part de la valeur achetée qui ne finira pas à la poubelle (pondérée périssabilité). */
export function wasteScore(items: readonly ShoppingItem[]): number {
  const price = items.reduce((s, i) => s + i.price, 0);
  if (price <= EPS) return 100;
  const atRisk = items.reduce((s, i) => s + i.leftoverValue, 0);
  return Math.round(Math.min(100, Math.max(0, 100 * (1 - atRisk / price))));
}

/** Variation du nombre d'articles à acheter et du prix entre deux listes (swap « à impact »). */
export function diffShoppingLists(before: ShoppingList, after: ShoppingList): { deltaItems: number; deltaPrice: number } {
  const count = (l: ShoppingList) => l.items.filter((i) => i.packs > 0).length;
  return { deltaItems: count(after) - count(before), deltaPrice: round2(after.totalPrice - before.totalPrice) };
}

/** Après les courses : les articles cochés entrent au garde-manger avec leur date limite. */
export function addPurchasesToPantry(
  pantry: readonly PantryItem[],
  list: ShoppingList,
  purchaseDate: ISODate,
  ingredients: readonly { id: IngredientId; shelfLifeDays: number }[],
): PantryItem[] {
  const shelf = new Map(ingredients.map((i) => [i.id, i.shelfLifeDays]));
  const added: PantryItem[] = [];
  for (const item of list.items) {
    if (!item.checked || item.bought <= EPS) continue;
    const days = shelf.get(item.ingredientId);
    added.push({
      ingredientId: item.ingredientId,
      quantity: item.bought,
      addedAt: purchaseDate,
      ...(days !== undefined ? { expiresAt: addDays(purchaseDate, days) } : {}),
    });
  }
  return [...pantry, ...added];
}

/** Décompte des quantités consommées (repas cuisiné), FIFO par date limite ; les lignes vides disparaissent. */
export function consumeFromPantry(pantry: readonly PantryItem[], needs: ReadonlyMap<IngredientId, number>): PantryItem[] {
  const remaining = new Map(needs);
  const sorted = [...pantry].sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999') || a.addedAt.localeCompare(b.addedAt));
  const out: PantryItem[] = [];
  for (const line of sorted) {
    const need = remaining.get(line.ingredientId) ?? 0;
    if (need <= EPS) {
      out.push(line);
      continue;
    }
    const taken = Math.min(need, line.quantity);
    remaining.set(line.ingredientId, need - taken);
    const left = line.quantity - taken;
    if (left > EPS) out.push({ ...line, quantity: left });
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
