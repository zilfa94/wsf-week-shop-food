/**
 * Cuisines préférées : familles de cuisines proposées à l'utilisateur et rattachement des recettes.
 * Les cuisines rares du jeu de données (italienne, indienne…) sont rangées dans une famille voisine
 * pour que « j'aime la cuisine méditerranéenne » couvre aussi les pâtes italiennes.
 */
import type { Cuisine, MealType, Recipe, UserProfile } from './types';

/** Famille de chaque cuisine (`other` = neutre : ni préférée ni pénalisée). */
export const CUISINE_FAMILY: Readonly<Record<Cuisine, Cuisine>> = {
  french: 'french',
  nordic: 'french',
  mediterranean: 'mediterranean',
  italian: 'mediterranean',
  asian: 'asian',
  indian: 'asian',
  oriental: 'oriental',
  mexican: 'other',
  american: 'other',
  other: 'other',
};

/** Précision affichée sous le libellé d'une famille (cuisines qu'elle regroupe). */
export const CUISINE_FAMILY_HINTS: Readonly<Partial<Record<Cuisine, string>>> = {
  french: 'plats traditionnels, gratins, mijotés',
  mediterranean: 'dont italienne et grecque',
  asian: 'dont indienne',
  oriental: 'maghrébine et moyen-orientale',
};

/** Nombre minimal de déjeuners / dîners pour qu'une famille soit proposée au choix. */
export const CUISINE_MIN_MAIN_RECIPES = 5;

const MAIN_TYPES: readonly MealType[] = ['lunch', 'dinner'];

export const cuisineFamily = (cuisine: Cuisine): Cuisine => CUISINE_FAMILY[cuisine];

export const isMainRecipe = (recipe: Recipe): boolean => recipe.mealTypes.some((t) => MAIN_TYPES.includes(t));

export interface CuisineChoice {
  readonly cuisine: Cuisine;
  /** Déjeuners / dîners disponibles dans cette famille. */
  readonly count: number;
}

/** Familles proposées au choix, avec leur nombre de plats, les mieux fournies d'abord (`other` jamais proposée). */
export function selectableCuisines(recipes: readonly Recipe[], minMain = CUISINE_MIN_MAIN_RECIPES): CuisineChoice[] {
  const counts = new Map<Cuisine, number>();
  for (const r of recipes) {
    if (!isMainRecipe(r)) continue;
    const family = cuisineFamily(r.cuisine);
    if (family === 'other') continue;
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minMain)
    .map(([cuisine, count]) => ({ cuisine, count }))
    .sort((a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine));
}

/** Familles préférées normalisées (doublons et cuisines rares ramenés à leur famille). */
export function preferredFamilies(preferred: readonly Cuisine[]): ReadonlySet<Cuisine> {
  return new Set(preferred.map(cuisineFamily).filter((c) => c !== 'other'));
}

/**
 * Un déjeuner / dîner est « hors préférences » si l'utilisateur a choisi des cuisines et que la famille
 * du plat n'en fait pas partie. Sans préférence, ou pour un petit-déjeuner / une collation, jamais.
 */
export function isOutsidePreferences(recipe: Recipe, families: ReadonlySet<Cuisine>, slotType?: MealType): boolean {
  if (families.size === 0) return false;
  if (slotType !== undefined && !MAIN_TYPES.includes(slotType)) return false;
  return !families.has(cuisineFamily(recipe.cuisine));
}

export const profileFamilies = (profile: Pick<UserProfile, 'preferredCuisines'>): ReadonlySet<Cuisine> => preferredFamilies(profile.preferredCuisines);
