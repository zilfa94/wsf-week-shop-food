/**
 * Libellés français des énumérations du contrat. Les identifiants restent en anglais dans le code ;
 * tout texte affiché passe par ici. Les `Record` complets sont vérifiés par TypeScript : ajouter
 * une valeur à une énumération oblige à ajouter son libellé.
 */
import type {
  Activity,
  Aisle,
  Allergen,
  CarbKind,
  Cuisine,
  Diet,
  Goal,
  MealType,
  ProteinKind,
  RecipeTag,
  Season,
  Unit,
  Weekday,
} from './types';

export const AISLE_LABELS: Readonly<Record<Aisle, string>> = {
  fruits_vegetables: 'Fruits & légumes',
  bakery: 'Boulangerie',
  butcher: 'Boucherie',
  fish: 'Poissonnerie',
  dairy: 'Crèmerie',
  dry_goods: 'Épicerie salée',
  condiments: 'Condiments & épices',
  sweet_grocery: 'Épicerie sucrée',
  drinks: 'Boissons',
  frozen: 'Surgelés',
  other: 'Autre',
};

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export const DIET_LABELS: Readonly<Record<Diet, string>> = {
  omnivore: 'Omnivore',
  vegetarian: 'Végétarien',
  vegan: 'Végétalien',
  no_pork: 'Sans porc',
  pescatarian: 'Pescétarien',
};

export const GOAL_LABELS: Readonly<Record<Goal, string>> = {
  balance: 'Équilibre',
  weight_loss: 'Perte de poids',
  muscle_gain: 'Prise de masse',
  budget: 'Budget serré',
};

export const ALLERGEN_LABELS: Readonly<Record<Allergen, string>> = {
  gluten: 'Gluten',
  crustaceans: 'Crustacés',
  egg: 'Œufs',
  fish: 'Poisson',
  peanut: 'Arachide',
  soy: 'Soja',
  milk: 'Lait (lactose)',
  nuts: 'Fruits à coque',
  celery: 'Céleri',
  mustard: 'Moutarde',
  sesame: 'Sésame',
  sulphites: 'Sulfites',
  lupin: 'Lupin',
  molluscs: 'Mollusques',
};

/** Allergènes proposés dans l'onboarding (les autres restent accessibles dans le profil). */
export const ONBOARDING_ALLERGENS: readonly Allergen[] = [
  'gluten',
  'milk',
  'nuts',
  'egg',
  'peanut',
  'soy',
  'crustaceans',
  'sesame',
];

export const SEASON_LABELS: Readonly<Record<Season, string>> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
};

export const CUISINE_LABELS: Readonly<Record<Cuisine, string>> = {
  french: 'Française',
  mediterranean: 'Méditerranéenne',
  italian: 'Italienne',
  asian: 'Asiatique',
  oriental: 'Orientale',
  indian: 'Indienne',
  mexican: 'Mexicaine',
  nordic: 'Nordique',
  american: 'Américaine',
  other: 'Autre',
};

export const PROTEIN_LABELS: Readonly<Record<ProteinKind, string>> = {
  poultry: 'Volaille',
  beef: 'Bœuf',
  pork: 'Porc',
  lamb: 'Agneau',
  fish: 'Poisson',
  shellfish: 'Fruits de mer',
  egg: 'Œufs',
  legume: 'Légumineuses',
  tofu: 'Tofu',
  dairy: 'Produits laitiers',
  none: 'Sans protéine principale',
};

export const CARB_LABELS: Readonly<Record<CarbKind, string>> = {
  pasta: 'Pâtes',
  rice: 'Riz',
  potato: 'Pommes de terre',
  bread: 'Pain',
  quinoa: 'Quinoa',
  bulgur: 'Boulgour',
  legume: 'Légumineuses',
  oats: 'Avoine',
  none: 'Sans féculent',
};

export const RECIPE_TAG_LABELS: Readonly<Record<RecipeTag, string>> = {
  quick: 'Rapide',
  batch: 'Batch cooking',
  no_cook: 'Sans cuisson',
  one_pot: 'Plat unique',
  comfort: 'Réconfortant',
  light: 'Léger',
  high_protein: 'Riche en protéines',
  high_fiber: 'Riche en fibres',
  cheap: 'Économique',
  kids: 'Pour les enfants',
  takeaway: 'À emporter',
};

export const ACTIVITY_LABELS: Readonly<Record<Activity, string>> = {
  sedentary: 'Sédentaire',
  light: 'Légère',
  moderate: 'Modérée',
  intense: 'Intense',
};

/** Abréviations d'unités telles qu'affichées dans une recette. */
export const UNIT_LABELS: Readonly<Record<Unit, string>> = {
  g: 'g',
  ml: 'ml',
  piece: 'pièce',
  kg: 'kg',
  l: 'L',
  cl: 'cl',
  tbsp: 'c. à s.',
  tsp: 'c. à c.',
  pinch: 'pincée',
  bunch: 'botte',
  clove: 'gousse',
  slice: 'tranche',
  can: 'boîte',
  sachet: 'sachet',
  handful: 'poignée',
};

/** Pluriels des unités comptables (« 2 gousses »). */
const UNIT_PLURALS: Partial<Readonly<Record<Unit, string>>> = {
  piece: 'pièces',
  pinch: 'pincées',
  bunch: 'bottes',
  clove: 'gousses',
  slice: 'tranches',
  can: 'boîtes',
  sachet: 'sachets',
  handful: 'poignées',
};

export function unitLabel(unit: Unit, quantity: number): string {
  return quantity > 1 ? (UNIT_PLURALS[unit] ?? UNIT_LABELS[unit]) : UNIT_LABELS[unit];
}

export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

export const WEEKDAY_SHORT_LABELS: Readonly<Record<Weekday, string>> = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mer',
  3: 'Jeu',
  4: 'Ven',
  5: 'Sam',
  6: 'Dim',
};

export const MONTH_SHORT_LABELS: readonly string[] = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
