/** Invariants du jeu de données complet (docs/SPEC.md § 3.4). */
import { AISLE_ORDER } from '../../core/aisles';
import { CUISINE_MIN_MAIN_RECIPES, cuisineFamily, selectableCuisines } from '../../core/cuisines';
import { indexIngredients } from '../../core/dataset';
import { candidatesForSlot, isRecipeEligible, totalMinutes } from '../../core/filter';
import { generateWeekPlan } from '../../core/planner';
import type { CarbKind, Cuisine, FoodClass, MealType, ProteinKind, RecipeTag, Season, UserProfile } from '../../core/types';
import { toCanonical } from '../../core/units';
import { DISH_PHOTOS } from '../dish-photos';
import { FOOD_IMAGES, INGREDIENT_IMAGE, RECIPE_IMAGE } from '../food-images';
import { DATASET, DATASET_VERSION } from '../index';
import { INGREDIENTS } from '../ingredients';
import { RECIPES } from '../recipes';

const INDEX = indexIngredients(INGREDIENTS);
const ID_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack']);
const CUISINES = new Set<Cuisine>(['french', 'mediterranean', 'italian', 'asian', 'oriental', 'indian', 'mexican', 'nordic', 'american', 'other']);
const PROTEINS = new Set<ProteinKind>(['poultry', 'beef', 'pork', 'lamb', 'fish', 'shellfish', 'egg', 'legume', 'tofu', 'dairy', 'none']);
const CARBS = new Set<CarbKind>(['pasta', 'rice', 'potato', 'bread', 'quinoa', 'bulgur', 'legume', 'oats', 'none']);
const TAGS = new Set<RecipeTag>(['quick', 'batch', 'no_cook', 'one_pot', 'comfort', 'light', 'high_protein', 'high_fiber', 'cheap', 'kids', 'takeaway']);
const SEASONS = new Set<Season>(['spring', 'summer', 'autumn', 'winter']);
const PROTEIN_CLASSES: Partial<Record<ProteinKind, readonly FoodClass[]>> = {
  poultry: ['poultry'],
  beef: ['beef'],
  pork: ['pork'],
  lamb: ['lamb'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  egg: ['egg'],
  dairy: ['dairy'],
};

const OMNIVORE: UserProfile = {
  persons: 2,
  diet: 'omnivore',
  allergens: [],
  dislikedIngredientIds: [],
  preferredCuisines: [],
  goal: 'balance',
  maxCookMinWeekday: 30,
  maxCookMinWeekend: 90,
  includeBreakfast: true,
  includeLunch: true,
  includeDinner: true,
  includeSnack: true,
  allowBatchCooking: true,
  assumeStaples: true,
};
const VEGAN_GF: UserProfile = { ...OMNIVORE, diet: 'vegan', allergens: ['gluten'], maxCookMinWeekday: 45 };

describe('recettes', () => {
  it('au moins 60 recettes, ids et noms uniques', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(60);
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID_RE);
    const names = RECIPES.map((r) => r.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('chaque ingrédient référencé existe et chaque quantité est convertible', () => {
    const problems: string[] = [];
    for (const r of RECIPES) {
      const w = `${r.id} :`;
      if (r.ingredients.length < 2 || r.ingredients.length > 12) problems.push(`${w} ${r.ingredients.length} ingrédients`);
      for (const ri of r.ingredients) {
        const ing = INDEX.get(ri.ingredientId);
        if (!ing) {
          problems.push(`${w} ingrédient inconnu ${ri.ingredientId}`);
          continue;
        }
        if (!(ri.quantity > 0)) problems.push(`${w} quantité de ${ri.ingredientId}`);
        try {
          toCanonical(ing, ri.quantity, ri.unit);
        } catch {
          problems.push(`${w} ${ri.ingredientId} en ${ri.unit} non convertible (canonique ${ing.canonicalUnit})`);
        }
      }
      const ids = r.ingredients.map((i) => i.ingredientId);
      if (new Set(ids).size !== ids.length) problems.push(`${w} ingrédient en double`);
    }
    expect(problems).toEqual([]);
  });

  it('champs valides et cohérents', () => {
    const problems: string[] = [];
    for (const r of RECIPES) {
      const w = `${r.id} :`;
      if (r.name.trim().length === 0) problems.push(`${w} nom vide`);
      if (!CUISINES.has(r.cuisine)) problems.push(`${w} cuisine ${r.cuisine}`);
      if (r.mealTypes.length === 0) problems.push(`${w} aucun créneau`);
      for (const t of r.mealTypes) if (!MEAL_TYPES.has(t)) problems.push(`${w} créneau ${t}`);
      if (!(r.servings >= 1) || !Number.isInteger(r.servings)) problems.push(`${w} servings`);
      if (r.prepMin < 0 || r.cookMin < 0 || totalMinutes(r) <= 0) problems.push(`${w} temps`);
      if (!PROTEINS.has(r.mainProtein)) problems.push(`${w} mainProtein ${r.mainProtein}`);
      if (!CARBS.has(r.baseCarb)) problems.push(`${w} baseCarb ${r.baseCarb}`);
      for (const t of r.tags) if (!TAGS.has(t)) problems.push(`${w} tag ${t}`);
      for (const s of r.seasons) if (!SEASONS.has(s)) problems.push(`${w} saison ${s}`);
      if (r.steps.length < 3) problems.push(`${w} moins de 3 étapes`);
      for (const s of r.steps) if (s.trim().length <= 10) problems.push(`${w} étape trop courte « ${s} »`);
      const n = r.nutritionPerServing;
      if (!(n.kcal > 80 && n.kcal < 1100)) problems.push(`${w} kcal ${n.kcal}`);
      if ([n.protein, n.carbs, n.fat, n.fiber].some((v) => !(v >= 0))) problems.push(`${w} macro négative`);
      const drift = Math.abs(n.protein * 4 + n.carbs * 4 + n.fat * 9 - n.kcal) / n.kcal;
      if (!(drift < 0.3)) problems.push(`${w} kcal ${n.kcal} incohérent avec les macros (écart ${Math.round(drift * 100)} %)`);
      if (r.tags.includes('no_cook') && r.cookMin !== 0) problems.push(`${w} no_cook avec cuisson`);
      if (r.tags.includes('quick') && totalMinutes(r) > 20) problems.push(`${w} quick mais ${totalMinutes(r)} min`);
      if (r.batchable && !r.mealTypes.some((t) => t === 'lunch' || t === 'dinner')) problems.push(`${w} batchable hors déjeuner/dîner`);
      const classes = PROTEIN_CLASSES[r.mainProtein];
      if (classes && !r.ingredients.some((ri) => classes.includes(INDEX.get(ri.ingredientId)?.foodClass as FoodClass))) {
        problems.push(`${w} mainProtein ${r.mainProtein} sans ingrédient correspondant`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('couverture : chaque créneau a assez de candidats pour un omnivore et pour un végétalien sans gluten', () => {
    const season: Season = 'autumn';
    const count = (profile: UserProfile, type: MealType, day: 0 | 5) =>
      candidatesForSlot(RECIPES, { day, type }, profile, INDEX, season).length;
    expect(count(OMNIVORE, 'breakfast', 0)).toBeGreaterThanOrEqual(10);
    expect(count(OMNIVORE, 'snack', 0)).toBeGreaterThanOrEqual(6);
    expect(count(OMNIVORE, 'lunch', 0)).toBeGreaterThanOrEqual(14); // ≤ 30 min en semaine
    expect(count(OMNIVORE, 'dinner', 0)).toBeGreaterThanOrEqual(14);
    expect(count(OMNIVORE, 'dinner', 5)).toBeGreaterThanOrEqual(35);
    expect(count(VEGAN_GF, 'lunch', 5)).toBeGreaterThanOrEqual(7);
    expect(count(VEGAN_GF, 'dinner', 5)).toBeGreaterThanOrEqual(7);
    expect(count(VEGAN_GF, 'breakfast', 0)).toBeGreaterThanOrEqual(3);
    const vegetarianMains = RECIPES.filter((r) => r.mealTypes.some((t) => t === 'lunch' || t === 'dinner') && isRecipeEligible(r, { ...OMNIVORE, diet: 'vegetarian' }, INDEX));
    expect(vegetarianMains.length).toBeGreaterThanOrEqual(15);
  });

  it('variété : protéines et féculents répartis, ≥ 40 % des plats en ≤ 30 min', () => {
    const mains = RECIPES.filter((r) => r.mealTypes.some((t) => t === 'lunch' || t === 'dinner'));
    const byProtein = new Map<string, number>();
    for (const r of mains) byProtein.set(r.mainProtein, (byProtein.get(r.mainProtein) ?? 0) + 1);
    for (const [protein, n] of byProtein) if (protein !== 'none') expect(n / mains.length).toBeLessThanOrEqual(0.3);
    expect(mains.filter((r) => totalMinutes(r) <= 30).length / mains.length).toBeGreaterThanOrEqual(0.4);
    expect(mains.filter((r) => r.batchable).length).toBeGreaterThanOrEqual(8);
  });

  it('anti-gaspi : aucun ingrédient périssable n’est utilisé par une seule recette', () => {
    const uses = new Map<string, number>();
    for (const r of RECIPES) for (const ri of r.ingredients) uses.set(ri.ingredientId, (uses.get(ri.ingredientId) ?? 0) + 1);
    const perishables = INGREDIENTS.filter((i) => i.shelfLifeDays <= 14 && !i.staple);
    // un ingrédient jamais utilisé reste disponible pour le garde-manger ; utilisé une seule fois, son reste est orphelin
    const orphans = perishables.filter((i) => uses.get(i.id) === 1).map((i) => i.id);
    expect(orphans).toEqual([]);
  });

  it('chaque ingrédient et chaque recette ont une image PNG (scripts/food-images.py)', () => {
    const problems: string[] = [];
    for (const i of INGREDIENTS) if (!(INGREDIENT_IMAGE[i.id] && FOOD_IMAGES[INGREDIENT_IMAGE[i.id]!])) problems.push(`ingrédient sans image : ${i.id}`);
    for (const r of RECIPES) if (!(RECIPE_IMAGE[r.id] && FOOD_IMAGES[RECIPE_IMAGE[r.id]!])) problems.push(`recette sans image : ${r.id}`);
    for (const id of Object.keys(INGREDIENT_IMAGE)) if (!INDEX.has(id)) problems.push(`image d’un ingrédient inconnu : ${id}`);
    const recipeIds = new Set(RECIPES.map((r) => r.id));
    for (const id of Object.keys(RECIPE_IMAGE)) if (!recipeIds.has(id)) problems.push(`image d’une recette inconnue : ${id}`);
    // Les photos réelles sont facultatives (elles arrivent par lots), mais ne doivent pas survivre
    // à la recette qu'elles illustraient.
    for (const id of Object.keys(DISH_PHOTOS)) if (!recipeIds.has(id)) problems.push(`photo d’une recette inconnue : ${id}`);
    expect(problems).toEqual([]);
  });

  it('jeu de données assemblé et génération réelle sans créneau vide', () => {
    expect(DATASET.version).toBe(DATASET_VERSION);
    expect(DATASET.recipes).toBe(RECIPES);
    expect(DATASET.ingredients).toBe(INGREDIENTS);
    for (const a of AISLE_ORDER) expect(typeof a).toBe('string');
    const plan = generateWeekPlan({ dataset: DATASET, profile: OMNIVORE, pantry: [], weekStart: '2026-09-14', today: '2026-09-12', seed: 1, params: { anneal: { iterations: 500 } } });
    expect(plan.unfilled).toEqual([]);
    expect(plan.meals).toHaveLength(28);
    const vegan = generateWeekPlan({ dataset: DATASET, profile: { ...VEGAN_GF, includeSnack: false }, pantry: [], weekStart: '2026-09-14', today: '2026-09-12', seed: 2, params: { anneal: { iterations: 500 } } });
    expect(vegan.unfilled.length).toBeLessThanOrEqual(4);
  });

  it('cuisines préférées : 4 familles proposées, et une préférence oriente vraiment les déjeuners / dîners', () => {
    const choices = selectableCuisines(RECIPES);
    expect(choices.map((c) => c.cuisine).sort()).toEqual(['asian', 'french', 'mediterranean', 'oriental']);
    for (const c of choices) expect(c.count).toBeGreaterThanOrEqual(CUISINE_MIN_MAIN_RECIPES);

    const recipeById = new Map(RECIPES.map((r) => [r.id, r]));
    const mainsOf = (profile: UserProfile, seed: number) =>
      generateWeekPlan({ dataset: DATASET, profile, pantry: [], weekStart: '2026-09-14', today: '2026-09-12', seed, params: { anneal: { iterations: 800 } } })
        .meals.filter((m) => m.slot.type === 'lunch' || m.slot.type === 'dinner')
        .map((m) => cuisineFamily(recipeById.get(m.recipeId)!.cuisine));

    // Asiatique seule (20 plats) : la semaine entière reste dans la famille.
    const asian = mainsOf({ ...OMNIVORE, preferredCuisines: ['asian'] }, 3);
    expect(asian.filter((c) => c === 'asian').length).toBeGreaterThanOrEqual(13);
    // Orientale seule (17 plats depuis la deuxième série) : la semaine est presque entièrement orientale.
    const oriental = mainsOf({ ...OMNIVORE, preferredCuisines: ['oriental'] }, 6);
    expect(oriental.filter((c) => c === 'oriental').length).toBeGreaterThanOrEqual(12);
    // Française + méditerranéenne (40 plats) : la semaine entière reste dans les préférences.
    const frMed = mainsOf({ ...OMNIVORE, preferredCuisines: ['french', 'mediterranean'] }, 4);
    expect(frMed.every((c) => c === 'french' || c === 'mediterranean')).toBe(true);
    // Sans préférence, la variété impose un mélange de familles.
    expect(new Set(mainsOf(OMNIVORE, 5)).size).toBeGreaterThanOrEqual(3);
  });
});
