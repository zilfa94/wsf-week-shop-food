/**
 * Contraintes dures d'éligibilité d'une recette : régime (dérivé de `foodClass`), allergènes,
 * aversions, temps disponible (semaine / week-end), saison, créneau. Le régime est dérivé des
 * ingrédients — aucune recette ne déclare ses régimes, il n'y a donc pas de contradiction possible.
 */
import type { IngredientIndex } from './dataset';
import type { Diet, FoodClass, Ingredient, MealSlot, MealType, Recipe, Season, UserProfile, Weekday } from './types';

const MEAT: readonly FoodClass[] = ['poultry', 'beef', 'pork', 'lamb', 'other_meat'];

/** Classes alimentaires interdites par régime. */
export const DIET_FORBIDDEN: Readonly<Record<Diet, readonly FoodClass[]>> = {
  omnivore: [],
  no_pork: ['pork'],
  pescatarian: MEAT,
  vegetarian: [...MEAT, 'fish', 'shellfish'],
  vegan: [...MEAT, 'fish', 'shellfish', 'egg', 'dairy', 'honey'],
};

/** Vrai si l'ingrédient est exclu par le régime, une allergie ou une aversion du profil. */
export function isIngredientForbidden(ing: Ingredient, profile: UserProfile): boolean {
  if (DIET_FORBIDDEN[profile.diet].includes(ing.foodClass)) return true;
  if (ing.allergens.some((a) => profile.allergens.includes(a))) return true;
  return profile.dislikedIngredientIds.includes(ing.id);
}

/**
 * Une recette est éligible si aucun de ses ingrédients NON optionnels n'est interdit.
 * Un ingrédient optionnel interdit est simplement retiré (voir `shopping.ts`).
 * Ingrédient inconnu → inéligible (le test d'intégrité des données doit l'empêcher).
 */
export function isRecipeEligible(recipe: Recipe, profile: UserProfile, ingredients: IngredientIndex): boolean {
  for (const ri of recipe.ingredients) {
    if (ri.optional) continue;
    const ing = ingredients.get(ri.ingredientId);
    if (!ing || isIngredientForbidden(ing, profile)) return false;
  }
  return true;
}

export function isWeekend(day: Weekday): boolean {
  return day >= 5;
}

export function totalMinutes(recipe: Pick<Recipe, 'prepMin' | 'cookMin'>): number {
  return recipe.prepMin + recipe.cookMin;
}

/** Temps total ≤ budget du jour (semaine ou week-end). */
export function fitsTime(recipe: Recipe, day: Weekday, profile: UserProfile): boolean {
  const max = isWeekend(day) ? profile.maxCookMinWeekend : profile.maxCookMinWeekday;
  return totalMinutes(recipe) <= max;
}

/** `seasons: []` = toute l'année. */
export function fitsSeason(recipe: Recipe, season: Season): boolean {
  return recipe.seasons.length === 0 || recipe.seasons.includes(season);
}

export function fitsMealType(recipe: Recipe, type: MealType): boolean {
  return recipe.mealTypes.includes(type);
}

/** Recettes proposables pour un créneau donné (toutes contraintes dures réunies). */
export function candidatesForSlot(
  recipes: readonly Recipe[],
  slot: MealSlot,
  profile: UserProfile,
  ingredients: IngredientIndex,
  season: Season,
): Recipe[] {
  return recipes.filter(
    (r) =>
      fitsMealType(r, slot.type) &&
      fitsTime(r, slot.day, profile) &&
      fitsSeason(r, season) &&
      isRecipeEligible(r, profile, ingredients),
  );
}

/** Créneaux demandés par le profil, jour par jour (lundi = 0). */
export function slotsForProfile(profile: Pick<UserProfile, 'includeBreakfast' | 'includeSnack'>): MealSlot[] {
  const types: MealType[] = [];
  if (profile.includeBreakfast) types.push('breakfast');
  types.push('lunch', 'dinner');
  if (profile.includeSnack) types.push('snack');
  const slots: MealSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (const type of types) slots.push({ day: day as Weekday, type });
  }
  return slots;
}

/** Clé stable d'un créneau, aussi utilisée comme `Meal.id`. */
export function slotKey(slot: MealSlot): string {
  return `${slot.day}-${slot.type}`;
}
