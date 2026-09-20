/**
 * CONTRAT DE TYPES de WSF · Week Shop Food.
 *
 * Ce fichier est la source de vérité partagée par les données (`src/data/`), la logique
 * métier (`src/core/`), le store (`src/store/`) et les écrans (`src/app/`). Il n'importe rien.
 * Règles (CLAUDE.md § 5) : toute modification impose typecheck + données + core + store +
 * écrans + tests. Identifiants et valeurs d'énumération en anglais ; libellés français dans
 * `src/core/labels.ts`. Tout ce qui est persisté doit être sérialisable en JSON (pas de
 * Map/Set/Date) — les structures de travail du planificateur ne sont pas dans ce fichier.
 */

// ---------------------------------------------------------------------------
// Identifiants et dates
// ---------------------------------------------------------------------------

/** Id d'ingrédient : snake_case français sans accent (`creme_fraiche`, `oeuf`). Vérifié par le test d'intégrité des données. */
export type IngredientId = string;
/** Id de recette : snake_case français sans accent (`shakshuka`, `gratin_dauphinois`). */
export type RecipeId = string;
/** Date locale au format `YYYY-MM-DD`, jamais d'heure ni de fuseau (voir `date.ts`). */
export type ISODate = string;

// ---------------------------------------------------------------------------
// Unités
// ---------------------------------------------------------------------------

/** Unités canoniques d'agrégation : masse (g), volume (ml) ou pièce. */
export type CanonicalUnit = 'g' | 'ml' | 'piece';

/**
 * Unités autorisées dans une recette. Converties en unité canonique par `units.ts` :
 * kg/l/cl par facteur fixe ; tbsp/tsp fixes uniquement si l'ingrédient est en ml ;
 * les autres (et tbsp/tsp pour un solide) exigent une entrée dans `Ingredient.conversions`.
 */
export type Unit =
  | CanonicalUnit
  | 'kg'
  | 'l'
  | 'cl'
  | 'tbsp' // cuillère à soupe (15 ml)
  | 'tsp' // cuillère à café (5 ml)
  | 'pinch' // pincée
  | 'bunch' // botte
  | 'clove' // gousse
  | 'slice' // tranche
  | 'can' // boîte / conserve
  | 'sachet'
  | 'handful'; // poignée

// ---------------------------------------------------------------------------
// Énumérations métier
// ---------------------------------------------------------------------------

/** Rayons du magasin ; l'ordre de parcours est dans `src/data/aisles.ts`. */
export type Aisle =
  | 'fruits_vegetables'
  | 'bakery'
  | 'butcher'
  | 'fish'
  | 'dairy' // crèmerie : lait, beurre, fromages, œufs, yaourts
  | 'dry_goods' // épicerie salée : pâtes, riz, conserves, légumineuses
  | 'condiments' // huiles, vinaigres, épices, sauces
  | 'sweet_grocery' // épicerie sucrée
  | 'drinks'
  | 'frozen'
  | 'other';

/** Classe alimentaire d'un ingrédient ; les régimes en dérivent (`filter.ts`). */
export type FoodClass =
  | 'plant'
  | 'egg'
  | 'dairy'
  | 'honey'
  | 'fish'
  | 'shellfish'
  | 'poultry'
  | 'beef'
  | 'pork'
  | 'lamb'
  | 'other_meat';

/** Les 14 allergènes à déclaration obligatoire (UE) ; l'onboarding n'en propose qu'un sous-ensemble. */
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'egg'
  | 'fish'
  | 'peanut'
  | 'soy'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Cuisine =
  | 'french'
  | 'mediterranean'
  | 'italian'
  | 'asian'
  | 'oriental'
  | 'indian'
  | 'mexican'
  | 'nordic'
  | 'american'
  | 'other';

/** Protéine principale d'une recette (contrainte de variété). */
export type ProteinKind =
  | 'poultry'
  | 'beef'
  | 'pork'
  | 'lamb'
  | 'fish'
  | 'shellfish'
  | 'egg'
  | 'legume'
  | 'tofu'
  | 'dairy'
  | 'none';

/** Féculent de base d'une recette (contrainte de variété). */
export type CarbKind =
  | 'pasta'
  | 'rice'
  | 'potato'
  | 'bread'
  | 'quinoa'
  | 'bulgur'
  | 'legume'
  | 'oats'
  | 'none';

export type RecipeTag =
  | 'quick' // ≤ 20 min au total
  | 'batch' // se double bien
  | 'no_cook'
  | 'one_pot'
  | 'comfort'
  | 'light'
  | 'high_protein'
  | 'high_fiber'
  | 'cheap'
  | 'kids'
  | 'takeaway'; // s'emporte au travail

export type Diet = 'omnivore' | 'vegetarian' | 'vegan' | 'no_pork' | 'pescatarian';

export type Goal = 'balance' | 'weight_loss' | 'muscle_gain' | 'budget';

export type Activity = 'sedentary' | 'light' | 'moderate' | 'intense';

/** Jour de la semaine, 0 = lundi … 6 = dimanche. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

/** Macros pour une portion (recette) ou un total (jour). Grammes sauf kcal. */
export interface Macros {
  readonly kcal: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  readonly fiber: number;
}

/** Cible journalière calculée par `nutrition.ts` à partir du profil. */
export interface NutritionTarget {
  /** Besoin journalier total (tout compris). */
  readonly kcal: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  /**
   * Part attendue des repas planifiés (assiettes cuisinées) : `PLANNED_SHARE` × kcal. Le reste
   * (pain, fruits, laitages, boissons) n'est pas planifié par l'application. Les scores et la
   * pénalité du planificateur comparent les macros des repas à cette part.
   */
  readonly plannedKcal: number;
  readonly plannedProtein: number;
  /** Part de kcal par type de repas (somme = kcal). */
  readonly perMeal: Readonly<Record<MealType, number>>;
}

export interface BodyInfo {
  readonly sex: 'f' | 'm';
  readonly age: number;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly activity: Activity;
}

// ---------------------------------------------------------------------------
// Ingrédient canonique
// ---------------------------------------------------------------------------

/** Conditionnement réel du commerce. */
export interface Packaging {
  /** `pack` = unité indivisible (paquet, boîte, botte) ; `bulk` = vrac, `size` est alors le pas d'arrondi (ex. 100 g). */
  readonly kind: 'pack' | 'bulk';
  /** Taille en unité canonique de l'ingrédient (500 g, 1000 ml, 6 pièces, 100 g de vrac). */
  readonly size: number;
  /** Prix indicatif en euros pour `size`. */
  readonly price: number;
  /** Libellé français d'achat : « paquet de 500 g », « boîte de 6 », « botte ». */
  readonly label: string;
}

export interface Ingredient {
  readonly id: IngredientId;
  /** Nom français au singulier, minuscule : « tomate », « crème fraîche ». */
  readonly name: string;
  /** Pluriel si irrégulier ou utile à l'affichage (« œufs », « pommes de terre »). */
  readonly namePlural?: string;
  readonly aisle: Aisle;
  readonly canonicalUnit: CanonicalUnit;
  /**
   * Facteurs spécifiques : 1 <unité> = n <canonicalUnit>. Ex. tomate `{ piece: 120 }`,
   * ail `{ clove: 5, piece: 40 }`, persil `{ bunch: 30, tbsp: 4 }`, farine `{ tbsp: 8, tsp: 3 }`.
   * kg/l/cl et tbsp/tsp (pour un ingrédient en ml) ont des valeurs par défaut dans `units.ts`.
   * Pour un ingrédient compté à la pièce, `g: 1 / poidsMoyenEnGrammes` (citron `{ g: 1 / 110 }`) permet
   * de comparer un prix au kilo (`prices.ts`) ; sans cette clé, un tel relevé est ignoré, jamais deviné.
   */
  readonly conversions: Partial<Readonly<Record<Unit, number>>>;
  /** Conditionnement par défaut. */
  readonly packaging: Packaging;
  /** Autres conditionnements proposés par « Changer le pack » (facultatif). */
  readonly altPackagings?: readonly Packaging[];
  /** Jours de conservation après achat/ouverture (365+ = quasi non périssable). */
  readonly shelfLifeDays: number;
  readonly freezable: boolean;
  /** Épicerie de fond (sel, poivre, huile) : non listée si `UserProfile.assumeStaples`. */
  readonly staple: boolean;
  readonly foodClass: FoodClass;
  readonly allergens: readonly Allergen[];
  /** Saisons de disponibilité ; absent = toute l'année. */
  readonly seasons?: readonly Season[];
  /** Idées génériques pour un reste : « à congeler en portions », « omelette », « soupe ». */
  readonly leftoverHints?: readonly string[];
}

// ---------------------------------------------------------------------------
// Recette
// ---------------------------------------------------------------------------

export interface RecipeIngredient {
  readonly ingredientId: IngredientId;
  /** Quantité pour `Recipe.servings` portions. */
  readonly quantity: number;
  readonly unit: Unit;
  /** Facultatif : retiré de la liste s'il est interdit (allergie, aversion) sans exclure la recette. */
  readonly optional?: boolean;
  /** Précision de préparation : « émincé », « à température ambiante ». */
  readonly note?: string;
}

export interface Recipe {
  readonly id: RecipeId;
  readonly name: string;
  readonly description?: string;
  readonly cuisine: Cuisine;
  /** Créneaux où la recette est proposable. */
  readonly mealTypes: readonly MealType[];
  /** Portions produites par la recette telle qu'écrite (≥ 1). */
  readonly servings: number;
  readonly ingredients: readonly RecipeIngredient[];
  readonly prepMin: number;
  readonly cookMin: number;
  /** Macros approximatives pour UNE portion. */
  readonly nutritionPerServing: Macros;
  readonly mainProtein: ProteinKind;
  readonly baseCarb: CarbKind;
  /** Saisons conseillées ; `[]` = toute l'année. */
  readonly seasons: readonly Season[];
  readonly tags: readonly RecipeTag[];
  /** Peut être doublée pour fournir le déjeuner du lendemain (batch cooking). */
  readonly batchable: boolean;
  readonly steps: readonly string[];
}

/** Jeu de données embarqué. `version` change à chaque modification des données (migrations, plans obsolètes). */
export interface Dataset {
  readonly version: string;
  readonly ingredients: readonly Ingredient[];
  readonly recipes: readonly Recipe[];
}

// ---------------------------------------------------------------------------
// Profil utilisateur
// ---------------------------------------------------------------------------

export interface UserProfile {
  /** 1..8 */
  readonly persons: number;
  readonly diet: Diet;
  readonly allergens: readonly Allergen[];
  readonly dislikedIngredientIds: readonly IngredientId[];
  readonly goal: Goal;
  /** Temps max (préparation + cuisson) d'une recette en semaine (lundi → vendredi). */
  readonly maxCookMinWeekday: number;
  /** Temps max le week-end. */
  readonly maxCookMinWeekend: number;
  /** Repas de la journée à planifier ; au moins un des trois doit être vrai (sinon déjeuner + dîner). */
  readonly includeBreakfast: boolean;
  readonly includeLunch: boolean;
  readonly includeDinner: boolean;
  readonly includeSnack: boolean;
  readonly allowBatchCooking: boolean;
  /** Ne pas lister sel, poivre, huile… (mais les rappeler dans `ShoppingList.staplesToCheck`). */
  readonly assumeStaples: boolean;
  /** Données corporelles facultatives pour affiner la cible calorique (Mifflin-St Jeor). */
  readonly body?: BodyInfo;
  /** Budget hebdomadaire souhaité (informatif, pénalité si objectif `budget`). */
  readonly weeklyBudgetEur?: number;
}

// ---------------------------------------------------------------------------
// Plan hebdomadaire
// ---------------------------------------------------------------------------

export interface MealSlot {
  readonly day: Weekday;
  readonly type: MealType;
}

/** Repas planifié. `id` = `${day}-${type}` : stable, unique dans un plan, utilisé par les routes, verrous, cochage. */
export interface Meal {
  readonly id: string;
  readonly slot: MealSlot;
  readonly recipeId: RecipeId;
  /** Portions à cuisiner (= persons, 2 × persons si source de batch, 0 si `leftoverOf`). */
  readonly servings: number;
  /** Conservé tel quel lors d'une régénération. */
  readonly locked: boolean;
  /** Marqué cuisiné par l'utilisateur : verrouillé de fait, garde-manger décompté. */
  readonly cooked: boolean;
  /** Ce repas est constitué des restes du repas d'id indiqué (batch cooking) : rien à acheter ni cuisiner. */
  readonly leftoverOf?: string;
}

/** Décomposition du coût minimisé par le planificateur (échelle « euro »), pour affichage/debug. */
export interface CostBreakdown {
  readonly total: number;
  readonly waste: number;
  readonly variety: number;
  readonly nutrition: number;
  readonly budget: number;
}

export interface WeekPlan {
  /** Identifiant unique du plan (`${weekStart}-${seed}`). */
  readonly id: string;
  /** Premier jour du plan (lundi par défaut, ou `AppSettings.weekStartDay`). */
  readonly weekStart: ISODate;
  readonly seed: number;
  readonly datasetVersion: string;
  /** Profil au moment de la génération (détecte un changement de personnes/régime). */
  readonly profileSnapshot: UserProfile;
  readonly meals: readonly Meal[];
  /** Créneaux demandés mais impossibles à remplir (contraintes trop fortes) — affichés à l'utilisateur. */
  readonly unfilled: readonly MealSlot[];
  readonly cost: CostBreakdown;
}

// ---------------------------------------------------------------------------
// Garde-manger
// ---------------------------------------------------------------------------

/** Une ligne de stock ; plusieurs lignes possibles pour un même ingrédient (consommation FIFO par péremption). */
export interface PantryItem {
  readonly ingredientId: IngredientId;
  /** Quantité en unité canonique de l'ingrédient. */
  readonly quantity: number;
  readonly addedAt: ISODate;
  readonly expiresAt?: ISODate;
}

// ---------------------------------------------------------------------------
// Liste de courses (DÉRIVÉE : jamais persistée en entier)
// ---------------------------------------------------------------------------

/** Utilisation d'un ingrédient par un repas du plan, en unité canonique. */
export interface IngredientUse {
  readonly mealId: string;
  readonly recipeId: RecipeId;
  readonly quantity: number;
}

export interface ShoppingItem {
  readonly ingredientId: IngredientId;
  readonly aisle: Aisle;
  /** Besoin brut du plan (canonique). */
  readonly needed: number;
  /** Part couverte par le garde-manger (non périmé au premier usage). */
  readonly fromPantry: number;
  /** `needed − fromPantry`, jamais négatif. */
  readonly toBuyExact: number;
  /** Conditionnement retenu (défaut ou choisi par l'utilisateur). */
  readonly packaging: Packaging;
  /** Index dans `[packaging, ...altPackagings]` de l'ingrédient (0 = défaut). */
  readonly packagingIndex: number;
  /** Nombre de conditionnements à acheter. */
  readonly packs: number;
  /** Quantité réellement achetée (`packs × size`). */
  readonly bought: number;
  /** `bought − toBuyExact` : reste prévisible. */
  readonly leftover: number;
  /** Valeur « à risque » du reste, pondérée par la périssabilité (euros). */
  readonly leftoverValue: number;
  /** Prix estimé (euros). */
  readonly price: number;
  /** Libellé d'achat : « 2 × paquet de 500 g », « 6 œufs ». */
  readonly label: string;
  readonly usedIn: readonly IngredientUse[];
  /** Premier jour d'utilisation (0..6), pour la péremption du garde-manger. */
  readonly firstUseDay: Weekday;
  readonly checked: boolean;
}

/** Article libre ajouté à la main (« papier alu ») : pas d'ingrédient, pas d'agrégation. */
export interface ManualItem {
  readonly id: string;
  readonly label: string;
  readonly aisle: Aisle;
  readonly price?: number;
  readonly checked: boolean;
}

export interface AisleSection {
  readonly aisle: Aisle;
  readonly items: readonly ShoppingItem[];
  readonly manualItems: readonly ManualItem[];
}

/** Suggestion d'utilisation d'un reste prévisible. */
export interface LeftoverSuggestion {
  readonly ingredientId: IngredientId;
  readonly leftover: number;
  readonly leftoverValue: number;
  /** Repas du plan qui réutilise déjà ce reste, s'il existe (« reste de mardi → jeudi »). */
  readonly reusedByMealId?: string;
  /** Recettes hors plan qui absorberaient le reste, triées par score décroissant. */
  readonly recipes: readonly {
    readonly recipeId: RecipeId;
    readonly coversValue: number;
    readonly extraCost: number;
    readonly score: number;
  }[];
  readonly hints: readonly string[];
  readonly freezable: boolean;
}

export interface ShoppingList {
  readonly planId: string;
  /** Tous les ingrédients agrégés, y compris `packs === 0` (entièrement couverts par le garde-manger). */
  readonly items: readonly ShoppingItem[];
  /** Sections dans l'ordre de parcours du magasin ; ne contiennent que les articles à acheter. */
  readonly sections: readonly AisleSection[];
  readonly manualItems: readonly ManualItem[];
  readonly totalPrice: number;
  readonly totalLeftoverValue: number;
  /** Ingrédients de fond supposés présents (à vérifier par l'utilisateur). */
  readonly staplesToCheck: readonly IngredientId[];
  /** Score anti-gaspillage 0..100 (part de la valeur achetée réellement consommée, pondérée périssabilité). */
  readonly wasteScore: number;
  readonly leftovers: readonly LeftoverSuggestion[];
}

// ---------------------------------------------------------------------------
// Swap, faisabilité, bilan
// ---------------------------------------------------------------------------

export interface SwapSuggestion {
  readonly recipeId: RecipeId;
  /** Plus bas = mieux. */
  readonly score: number;
  /** Variation du nombre d'articles à acheter. */
  readonly deltaItems: number;
  /** Variation du prix total (euros, signé). */
  readonly deltaPrice: number;
  /** Ingrédients déjà dans la liste (ou cochés/garde-manger) que la recette réutilise. */
  readonly reusedIngredientIds: readonly IngredientId[];
  /** Ingrédients à acheter en plus. */
  readonly newIngredientIds: readonly IngredientId[];
  /** Raisons en français prêtes à afficher : « Utilise vos restes de feta ». */
  readonly reasons: readonly string[];
}

/** Faisabilité d'une recette avec le garde-manger (« Cuisiner avec ce que j'ai »). */
export interface RecipeFeasibility {
  readonly recipeId: RecipeId;
  /** Part de la valeur des ingrédients disponible, 0..1. */
  readonly ratio: number;
  readonly missing: readonly { readonly ingredientId: IngredientId; readonly quantity: number }[];
}

export interface DayNutrition {
  readonly day: Weekday;
  readonly macros: Macros;
  /** Score 0..100 par rapport à la cible. */
  readonly score: number;
}

/** Bilan de fin de semaine. */
export interface WeekReport {
  readonly cookedMeals: number;
  readonly totalMeals: number;
  readonly balanceScore: number;
  readonly wasteScore: number;
  /** Restes qu'aucun repas ne réutilise. */
  readonly orphanLeftovers: readonly { readonly ingredientId: IngredientId; readonly quantity: number }[];
  /** Coût réel des courses de la semaine (euros, prix indicatifs). */
  readonly spentEur: number;
  /** Surcoût évité grâce aux ingrédients partagés entre plats : ce qu'aurait coûté un conditionnement par plat (euros). */
  readonly savedEur: number;
}

// ---------------------------------------------------------------------------
// Entrées des fonctions du core
// ---------------------------------------------------------------------------

/** Paramètres réglables du planificateur (valeurs par défaut dans `params.ts`). */
export interface PlannerParams {
  readonly weights: { readonly waste: number; readonly variety: number; readonly nutrition: number; readonly budget: number };
  readonly anneal: { readonly iterations: number; readonly t0: number; readonly tEnd: number };
  readonly greedyTopK: number;
  readonly maxBatchPerWeek: number;
  /** Valeur (échelle euro) d'une session de cuisine économisée : un batch est accepté si son surcoût reste sous ce bonus. */
  readonly batchBonus: number;
}

/** Surcharge partielle (en profondeur) des paramètres du planificateur. */
export interface PlannerParamsOverride {
  readonly weights?: Partial<PlannerParams['weights']>;
  readonly anneal?: Partial<PlannerParams['anneal']>;
  readonly greedyTopK?: number;
  readonly maxBatchPerWeek?: number;
  readonly batchBonus?: number;
}

export interface GenerateInput {
  readonly dataset: Dataset;
  readonly profile: UserProfile;
  readonly pantry: readonly PantryItem[];
  readonly weekStart: ISODate;
  /** Date du jour injectée (saison, péremption) — jamais lue par le core. */
  readonly today: ISODate;
  readonly seed: number;
  /** Repas verrouillés ou cuisinés d'un plan précédent, à conserver tels quels. */
  readonly keep?: readonly Meal[];
  readonly params?: PlannerParamsOverride;
}

// ---------------------------------------------------------------------------
// Réglages de l'application (persistés par le store)
// ---------------------------------------------------------------------------

export interface AppSettings {
  readonly hasOnboarded: boolean;
  readonly themeMode: 'system' | 'light' | 'dark';
  readonly hapticsEnabled: boolean;
  readonly showCalories: boolean;
  /** Jour de début de semaine / jour des courses. */
  readonly weekStartDay: Weekday;
  /** Code postal du foyer (5 chiffres) pour les prix des magasins proches ; `''` = inconnu. */
  readonly postalCode: string;
}

// ---------------------------------------------------------------------------
// Prix réels (flux JSON produit par `scraper/`, contrat miroir de scraper/src/types.ts)
// ---------------------------------------------------------------------------

/** Où le prix a été observé : en rayon (offres en supermarché), sur le drive d'un magasin, sur le site marchand. */
export type PriceSource = 'store' | 'drive' | 'site';
export type PriceUnit = 'kg' | 'l' | 'piece';

export interface PriceEntry {
  readonly ingredientId: IngredientId;
  readonly productName: string;
  /** Prix TTC du conditionnement (euros). */
  readonly price: number;
  /** €/kg, €/l ou €/pièce. */
  readonly unitPrice: number;
  readonly unit: PriceUnit;
  /** Contenu du conditionnement dans `unit`. */
  readonly packSize: number;
  readonly packLabel: string;
  readonly url: string;
  /** Période de validité annoncée (dates ISO), absente = prix courant au relevé. */
  readonly validFrom?: string;
  readonly validUntil?: string;
  readonly promo?: boolean;
}

export interface PriceFile {
  readonly retailer: string;
  /** `national` quand l'enseigne publie un prix unique. */
  readonly storeId: string;
  readonly storeName: string;
  /** Vide pour une portée nationale. */
  readonly postalCode: string;
  readonly source: PriceSource;
  /** Instant du relevé (ISO 8601). */
  readonly scrapedAt: string;
  readonly scraperVersion: string;
  readonly prices: readonly PriceEntry[];
}

export interface PriceIndexEntry {
  readonly retailer: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly postalCode: string;
  readonly source: PriceSource;
  readonly scrapedAt: string;
  /** Chemin relatif au dossier `prices/`. */
  readonly path: string;
  readonly count: number;
  readonly ingredients: number;
}

export interface PriceIndex {
  readonly generatedAt: string;
  readonly scraperVersion: string;
  readonly files: readonly PriceIndexEntry[];
}
