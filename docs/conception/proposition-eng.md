# WSF – Week Shop Food — Proposition d'architecture (Expo / React Native / TypeScript strict)

> Portée : Android + iOS, 100 % hors-ligne, aucun backend. Template `npx create-expo-app@latest` (expo-router, dossier `app/`, New Architecture, TypeScript strict). Toute la logique métier vit dans `src/core/` sous forme de fonctions pures, déterministes (PRNG seedé) et testées par jest-expo. L'UI ne fait que lire le store et appeler le core.

---

## 1. Arborescence complète du projet

```
WSF-Week Shop Food/
├── app/                                  # expo-router : UNIQUEMENT des routes (tout fichier ici devient une route)
│   ├── _layout.tsx                       # Root layout : ThemeProvider, gate d'hydratation zustand, SplashScreen, Stack
│   ├── +not-found.tsx                    # Route 404 (template)
│   ├── onboarding.tsx                    # Assistant profil (1er lancement) → redirige vers (tabs) une fois hasOnboarded
│   ├── (tabs)/
│   │   ├── _layout.tsx                   # Tabs : Semaine / Courses / Garde-manger / Profil
│   │   ├── index.tsx                     # Onglet "Semaine" : 7 jours × slots, bouton (re)générer, swap, verrou
│   │   ├── shopping.tsx                  # Onglet "Courses" : liste dérivée, regroupée par rayon, cases à cocher, budget, restes
│   │   ├── pantry.tsx                    # Onglet "Garde-manger" : stock déclaré (ingrédient + quantité + date)
│   │   └── profile.tsx                   # Onglet "Profil" : personnes, régime, allergènes, objectif, temps, aversions
│   ├── recipe/
│   │   └── [id].tsx                      # Fiche recette (ingrédients mis à l'échelle, étapes, macros)
│   └── swap/
│       └── [mealId].tsx                  # Modal : alternatives classées par score anti-gaspillage pour un repas
│
├── src/
│   ├── core/                             # LOGIQUE PURE — zéro import React/RN/Expo/zustand
│   │   ├── types.ts                      # Contrat de types (section 2) — figé en premier
│   │   ├── constants.ts                  # Cibles nutritionnelles par objectif, seuils anti-gaspillage, libellés d'unités
│   │   ├── random.ts                     # PRNG seedé (mulberry32), shuffle, pick — déterminisme des tests
│   │   ├── date.ts                       # ISODate 'YYYY-MM-DD' local, weekStart (lundi), addDays, saisonFromDate (sans Date.toLocale*)
│   │   ├── units.ts                      # toCanonical(qty, unit, ingredient), formatQuantity (FR : "1,5 kg", "6 pièces")
│   │   ├── nutrition.ts                  # Macros par repas/jour/semaine, cibles selon Goal, écart à la cible
│   │   ├── filters.ts                    # Recettes éligibles : régime, allergènes, aversions, temps, saison, slot
│   │   ├── scaling.ts                    # Mise à l'échelle d'une recette pour N personnes (arrondis "humains")
│   │   ├── aggregate.ts                  # Agrégation des ingrédients d'un WeekPlan → besoins en unité canonique
│   │   ├── packs.ts                      # Besoin → nb de packs à acheter, surplus, coût (conditionnements réels)
│   │   ├── pantry.ts                     # Déduction du garde-manger (FIFO, péremption), staples ignorés
│   │   ├── waste.ts                      # Score anti-gaspillage d'un plan (surplus périssable non réutilisé)
│   │   ├── leftovers.ts                  # Restes prévisibles (surplus + périssabilité) → suggestions de recettes
│   │   ├── shopping.ts                   # buildShoppingList(plan, pantry, ingredients, recipes) : orchestration pure
│   │   ├── planner.ts                    # generateWeekPlan / swapMeal / improvePlan (recherche locale sur score)
│   │   ├── scoring.ts                    # Score composite d'un plan : variété, nutrition, gaspillage, coût, temps
│   │   └── index.ts                      # Barrel export du core
│   │
│   ├── data/                             # DONNÉES LOCALES TYPÉES (FR)
│   │   ├── ingredients.ts                # ≥ 150 ingrédients canoniques (Ingredient[]) + INGREDIENTS_BY_ID
│   │   ├── recipes/
│   │   │   ├── index.ts                  # Concatène tous les fichiers, exporte RECIPES + RECIPES_BY_ID
│   │   │   ├── breakfast.ts              # ~12 petits-déjeuners
│   │   │   ├── french.ts                 # ~12 plats cuisine française
│   │   │   ├── mediterranean.ts          # ~12 méditerranéen / italien / grec
│   │   │   ├── asian.ts                  # ~12 asiatique
│   │   │   ├── oriental.ts               # ~10 oriental / maghreb / levant
│   │   │   ├── veggie.ts                 # ~10 végétarien / végétalien
│   │   │   └── snacks.ts                 # ~6 collations
│   │   └── validate.ts                   # validateDataset() : ids uniques, refs d'ingrédients valides, unités convertibles (utilisé par un test)
│   │
│   ├── store/                            # ZUSTAND + PERSISTANCE
│   │   ├── index.ts                      # useAppStore = create<AppState>()(persist(slices, {...}))
│   │   ├── storage.ts                    # createJSONStorage(() => AsyncStorage) + clé, version, migrations
│   │   ├── migrations.ts                 # migrate(persistedState, version) : v0→v1…
│   │   ├── slices/
│   │   │   ├── profileSlice.ts
│   │   │   ├── planSlice.ts
│   │   │   ├── shoppingSlice.ts          # uniquement "coché" + extras manuels
│   │   │   ├── pantrySlice.ts
│   │   │   └── settingsSlice.ts
│   │   ├── selectors.ts                  # sélecteurs purs (fonctions (state) => …) + inputs pour useMemo
│   │   └── hooks.ts                      # useShoppingList(), useDayNutrition(), useLeftovers(), useHydrated()
│   │
│   ├── components/
│   │   ├── ui/                           # Primitives : Screen, Card, Text, Button, Chip, Checkbox, Stepper, SectionHeader, EmptyState
│   │   ├── plan/                         # DayCard, MealRow, MealSlotBadge, NutritionBar, WeekHeader
│   │   ├── shopping/                     # AisleSection, ShoppingRow, BudgetSummary, LeftoverCard, SurplusBadge
│   │   ├── pantry/                       # PantryRow, IngredientPicker (recherche locale), QuantityInput
│   │   └── profile/                      # DietSelector, AllergenChips, GoalSelector, TimeSlider, DislikePicker
│   │
│   ├── theme/
│   │   ├── tokens.ts                     # couleurs (light/dark), espacements, rayons, typographie
│   │   ├── ThemeProvider.tsx             # Contexte + useTheme() (suit useColorScheme sauf override settings)
│   │   └── index.ts
│   │
│   ├── i18n/
│   │   ├── fr.ts                         # Dictionnaire FR (libellés UI, rayons, unités, régimes, allergènes, slots)
│   │   └── index.ts                      # t(key) typé (keyof typeof fr) — pas de lib externe
│   │
│   └── utils/
│       ├── ids.ts                        # nanoid-like sans dépendance (Math.random + timestamp) pour PlannedMeal.id
│       └── haptics.ts                    # wrapper expo-haptics (no-op sur web / si désactivé)
│
├── __tests__/
│   ├── core/
│   │   ├── units.test.ts
│   │   ├── date.test.ts
│   │   ├── scaling.test.ts
│   │   ├── aggregate.test.ts
│   │   ├── packs.test.ts
│   │   ├── pantry.test.ts
│   │   ├── waste.test.ts
│   │   ├── leftovers.test.ts
│   │   ├── filters.test.ts
│   │   ├── nutrition.test.ts
│   │   ├── planner.test.ts               # déterminisme (seed), contraintes respectées, swap recalcul
│   │   └── shopping.test.ts              # scénario bout-en-bout : plan → liste, garde-manger déduit
│   ├── data/
│   │   └── dataset.test.ts               # validateDataset(), ≥ 60 recettes, chaque slot couvert, chaque régime a ≥ N recettes
│   ├── store/
│   │   ├── store.test.ts                 # actions + partialize + migrations (AsyncStorage mocké)
│   │   └── selectors.test.ts
│   ├── components/
│   │   └── ShoppingRow.test.tsx          # snapshot minimal + toggle
│   └── fixtures/
│       ├── profile.ts                    # profils types (famille 4 omnivore, solo végétalien sans gluten…)
│       └── miniDataset.ts                # 8 ingrédients / 6 recettes pour tests rapides et lisibles
│
├── jest.setup.ts                         # mock AsyncStorage, mock expo-haptics, silence warnings
├── app.json                              # scheme, newArchEnabled, plugins (expo-router, expo-splash-screen)
├── tsconfig.json                         # extends expo/tsconfig.base, strict, paths "@/*"
├── eslint.config.js                      # eslint-config-expo (flat config, fourni par le template)
├── package.json                          # scripts + bloc "jest"
└── README.md
```

Règles : `app/` ne contient que des routes (expo-router transforme tout fichier en route) ; les composants, hooks et helpers vivent dans `src/`. `src/core/` ne dépend que de `types.ts` et de lui-même. `src/data/` ne dépend que de `types.ts`.

---

## 2. Types TypeScript (src/core/types.ts) — contrat définitif

```ts
// ---------- Identifiants nominaux ----------
export type IngredientId = string & { readonly __brand: 'IngredientId' };
export type RecipeId = string & { readonly __brand: 'RecipeId' };
export type PlannedMealId = string;           // généré à l'exécution (utils/ids)
export type WeekPlanId = string;
export type ISODate = string;                 // 'YYYY-MM-DD' (local, jamais d'heure)

export const asIngredientId = (s: string): IngredientId => s as IngredientId;
export const asRecipeId = (s: string): RecipeId => s as RecipeId;

// ---------- Unités ----------
/** Unités canoniques de stockage/agrégation : masse, volume, pièce. */
export type CanonicalUnit = 'g' | 'ml' | 'piece';
/** Unités autorisées dans les recettes (converties via Ingredient.conversions). */
export type Unit =
  | CanonicalUnit
  | 'kg' | 'l' | 'cl'
  | 'tbsp'      // c. à s. = 15 ml
  | 'tsp'       // c. à c. = 5 ml
  | 'pinch'     // pincée ≈ 0,5 g
  | 'bunch'     // botte
  | 'clove'     // gousse
  | 'slice'     // tranche
  | 'can'       // boîte/conserve
  | 'sachet'
  | 'handful';  // poignée

export interface Quantity { readonly value: number; readonly unit: Unit; }
export interface CanonicalQuantity { readonly value: number; readonly unit: CanonicalUnit; }

// ---------- Énumérations métier ----------
export type Aisle =
  | 'fruits_legumes' | 'boucherie' | 'volaille' | 'poissonnerie' | 'charcuterie'
  | 'cremerie' | 'fromages' | 'oeufs' | 'boulangerie' | 'feculents'
  | 'conserves' | 'epicerie_salee' | 'epicerie_sucree' | 'condiments_huiles'
  | 'herbes_epices' | 'surgeles' | 'boissons' | 'produits_monde' | 'autre';

export type Season = 'printemps' | 'ete' | 'automne' | 'hiver';
export type Diet = 'omnivore' | 'vegetarien' | 'vegetalien' | 'sans_porc' | 'pescetarien';
export type Allergen =
  | 'gluten' | 'lactose' | 'fruits_a_coque' | 'arachide' | 'oeuf'
  | 'soja' | 'poisson' | 'crustaces' | 'sesame' | 'moutarde' | 'celeri' | 'sulfites';
export type Goal = 'equilibre' | 'perte_de_poids' | 'prise_de_masse' | 'budget_serre';
export type MealSlot = 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';
export type Cuisine =
  | 'francaise' | 'mediterraneenne' | 'italienne' | 'asiatique' | 'indienne'
  | 'orientale' | 'mexicaine' | 'nordique' | 'americaine' | 'internationale';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = lundi
export type RecipeTag =
  | 'rapide' | 'batch_cooking' | 'sans_cuisson' | 'one_pot' | 'reconfortant'
  | 'leger' | 'riche_en_proteines' | 'riche_en_fibres' | 'economique'
  | 'enfants' | 'a_emporter' | 'reste_ok';
export type IngredientTag = 'staple' | 'frais' | 'proteine' | 'feculent' | 'legume' | 'fruit' | 'laitier' | 'epice';
/** Classification alimentaire de l'ingrédient (sert aux filtres de régime). */
export type FoodClass = 'vegetal' | 'oeuf' | 'laitier' | 'poisson' | 'crustace' | 'volaille' | 'boeuf' | 'porc' | 'agneau' | 'autre_viande';

// ---------- Nutrition ----------
export interface NutritionInfo {
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly fiberG?: number;
}

// ---------- Ingrédient canonique ----------
export interface Pack {
  /** Taille d'un conditionnement en unité canonique (ex. 500 g, 1000 ml, 6 pièces). */
  readonly size: number;
  readonly unit: CanonicalUnit;
  /** Libellé FR d'achat : "paquet de 500 g", "boîte de 6", "botte", "bouteille 1 L". */
  readonly label: string;
}

export interface Ingredient {
  readonly id: IngredientId;
  readonly name: string;                 // "tomate"
  readonly namePlural?: string;          // "tomates"
  readonly aisle: Aisle;
  readonly canonicalUnit: CanonicalUnit;
  readonly pack: Pack;
  /** Jours de conservation après achat/ouverture. 365+ = non périssable. */
  readonly perishableDays: number;
  /** Prix indicatif d'un pack en euros. */
  readonly priceEurPerPack: number;
  /**
   * Facteurs : 1 <unit> = n <canonicalUnit>. Les unités volume↔volume et masse↔masse
   * sont gérées par units.ts ; ici on déclare les équivalences spécifiques
   * (ex. tomate : { piece: 120 } → 1 pièce = 120 g ; ail : { clove: 5 } ; persil : { bunch: 40 }).
   */
  readonly conversions: Partial<Record<Exclude<Unit, CanonicalUnit>, number>>;
  /** g/ml pour ingrédients pesés dont la recette donne un volume (farine 0,55 ; huile 0,92). */
  readonly density?: number;
  readonly foodClass: FoodClass;
  readonly allergens: readonly Allergen[];
  readonly tags: readonly IngredientTag[];
  /** Épicerie de fond (sel, poivre, huile) : supposée disponible, non listée sauf si stock déclaré à 0. */
  readonly isStaple: boolean;
  readonly seasons?: readonly Season[];  // absent = toute l'année
  readonly nutritionPer100?: NutritionInfo;
}

// ---------- Recette ----------
export interface RecipeIngredient {
  readonly ingredientId: IngredientId;
  readonly quantity: number;             // pour Recipe.servings portions
  readonly unit: Unit;
  readonly optional?: boolean;           // exclu de la liste de courses par défaut
  readonly note?: string;                // "émincé", "à température ambiante"
}

export interface Recipe {
  readonly id: RecipeId;
  readonly name: string;
  readonly description?: string;
  readonly cuisine: Cuisine;
  readonly slots: readonly MealSlot[];   // slots où la recette est proposable
  readonly servings: number;             // nb de portions de base (souvent 4, 2 pour PDJ)
  readonly prepMinutes: number;
  readonly cookMinutes: number;
  readonly seasons: readonly Season[];   // [] = toute l'année
  readonly tags: readonly RecipeTag[];
  readonly ingredients: readonly RecipeIngredient[];
  readonly steps: readonly string[];
  readonly nutritionPerServing: NutritionInfo;
  /** Régimes explicitement compatibles (validé par un test croisé avec foodClass des ingrédients). */
  readonly diets: readonly Diet[];
  /** Se réchauffe / se conserve bien → le planificateur peut le doubler pour un 2e repas. */
  readonly leftoverFriendly: boolean;
  readonly costLevel: 1 | 2 | 3;         // € / €€ / €€€
}

// ---------- Profil utilisateur ----------
export interface UserProfile {
  readonly persons: number;                       // 1..8
  readonly diet: Diet;
  readonly allergens: readonly Allergen[];
  readonly goal: Goal;
  readonly maxWeekdayCookMinutes: number;         // prep + cook, lun→ven
  readonly maxWeekendCookMinutes: number;
  readonly dislikedIngredientIds: readonly IngredientId[];
  readonly includeSnack: boolean;
  readonly includeBreakfast: boolean;
  readonly weeklyBudgetEur?: number;
}

// ---------- Plan hebdomadaire ----------
export interface PlannedMeal {
  readonly id: PlannedMealId;
  readonly slot: MealSlot;
  readonly recipeId: RecipeId;
  readonly servings: number;                      // portions à préparer (persons, ou ×2 si batch)
  /** Repas qui réutilise les portions cuisinées par un autre PlannedMeal (pas de nouvelle cuisson). */
  readonly leftoverOfMealId?: PlannedMealId;
  readonly locked: boolean;                       // l'utilisateur le garde lors d'une régénération
}

export interface DayPlan {
  readonly date: ISODate;
  readonly weekday: Weekday;
  readonly meals: readonly PlannedMeal[];
}

export interface WeekPlan {
  readonly id: WeekPlanId;
  readonly weekStart: ISODate;                    // lundi
  readonly days: readonly DayPlan[];              // longueur 7
  readonly seed: number;
  readonly generatedAt: string;                   // ISO datetime
  readonly profileSnapshot: UserProfile;          // profil au moment de la génération
  readonly score: PlanScore;
}

export interface PlanScore {
  readonly total: number;                         // 0..100
  readonly variety: number;
  readonly nutrition: number;
  readonly waste: number;                         // 100 = zéro surplus périssable orphelin
  readonly cost: number;
  readonly time: number;
}

// ---------- Garde-manger & restes ----------
export interface PantryItem {
  readonly ingredientId: IngredientId;
  readonly quantity: number;                      // en canonicalUnit de l'ingrédient
  readonly addedAt: ISODate;
  readonly expiresAt?: ISODate;
}

export interface Leftover {
  readonly ingredientId: IngredientId;
  readonly quantity: number;                      // surplus en canonicalUnit
  readonly expiresAt: ISODate;                    // date d'achat prévue + perishableDays
  readonly fromMealIds: readonly PlannedMealId[];
  readonly suggestedRecipeIds: readonly RecipeId[];
}

// ---------- Liste de courses (DÉRIVÉE) ----------
export interface ShoppingItem {
  readonly ingredientId: IngredientId;
  readonly aisle: Aisle;
  readonly neededQty: number;                     // besoin brut du plan (canonicalUnit)
  readonly pantryQty: number;                     // déduit du garde-manger
  readonly toBuyQty: number;                      // max(0, needed − pantry)
  readonly packs: number;                         // ceil(toBuyQty / pack.size)
  readonly packLabel: string;
  readonly surplusQty: number;                    // packs×size − toBuyQty
  readonly estimatedCostEur: number;
  readonly usedInMealIds: readonly PlannedMealId[];
  readonly checked: boolean;                      // fusionné depuis shoppingSlice
  readonly isManual: boolean;                     // ajouté à la main par l'utilisateur
}

export interface AisleGroup { readonly aisle: Aisle; readonly items: readonly ShoppingItem[]; }

export interface ShoppingList {
  readonly weekPlanId: WeekPlanId;
  readonly items: readonly ShoppingItem[];
  readonly byAisle: readonly AisleGroup[];        // ordre de parcours magasin (constants.AISLE_ORDER)
  readonly totalCostEur: number;
  readonly remainingCostEur: number;              // non cochés
  readonly leftovers: readonly Leftover[];
  readonly pantryUsed: readonly { ingredientId: IngredientId; quantity: number }[];
}

// ---------- Entrées / sorties des fonctions du core ----------
export interface Dataset {
  readonly recipes: readonly Recipe[];
  readonly ingredients: readonly Ingredient[];
}

export interface GenerateOptions {
  readonly profile: UserProfile;
  readonly weekStart: ISODate;
  readonly seed: number;
  readonly pantry: readonly PantryItem[];
  readonly dataset: Dataset;
  /** Repas verrouillés d'un plan précédent à conserver. */
  readonly lockedMeals?: readonly { date: ISODate; meal: PlannedMeal }[];
  /** Recettes vues récemment à pénaliser (variété inter-semaines). */
  readonly recentRecipeIds?: readonly RecipeId[];
  /** Itérations de recherche locale (défaut 40 ; 0 en test pour la vitesse). */
  readonly improveIterations?: number;
}

export interface SwapCandidate {
  readonly recipeId: RecipeId;
  readonly scoreDelta: number;                    // variation du score total si on remplace
  readonly wasteDelta: number;
  readonly reasons: readonly string[];            // "réutilise la crème entamée", "même temps de cuisson"
}

export interface ManualShoppingItem {
  readonly ingredientId: IngredientId;
  readonly packs: number;
}
```

Signatures des fonctions pures exportées par `src/core/index.ts` (le contrat d'API) :

```ts
// units.ts
toCanonical(q: Quantity, ing: Ingredient): CanonicalQuantity;      // lève une Error si non convertible
formatQuantity(value: number, unit: CanonicalUnit, ing?: Ingredient): string;
// scaling.ts
scaleRecipe(recipe: Recipe, servings: number): readonly RecipeIngredient[];
// aggregate.ts
aggregateNeeds(plan: WeekPlan, dataset: Dataset): Map<IngredientId, { qty: number; mealIds: PlannedMealId[] }>;
// pantry.ts
applyPantry(needs, pantry, ingredients, today: ISODate): { remaining: Map<…>; used: PantryUsed[] };
// packs.ts
packsFor(toBuy: number, ing: Ingredient): { packs: number; surplus: number; cost: number };
// waste.ts
wasteScore(plan: WeekPlan, dataset: Dataset, pantry: PantryItem[]): number;   // 0..100
// leftovers.ts
predictLeftovers(items: ShoppingItem[], plan: WeekPlan, dataset: Dataset): Leftover[];
// shopping.ts
buildShoppingList(plan, pantry, dataset, checked: Record<string, boolean>, manual: ManualShoppingItem[], today: ISODate): ShoppingList;
// filters.ts
eligibleRecipes(dataset, profile, slot: MealSlot, weekday: Weekday, season: Season): Recipe[];
// nutrition.ts
dayNutrition(day: DayPlan, dataset, persons: number): NutritionInfo;
targetsFor(goal: Goal): NutritionInfo;
// planner.ts
generateWeekPlan(opts: GenerateOptions): WeekPlan;
swapCandidates(plan, mealId, dataset, pantry, profile, limit?: number): SwapCandidate[];
applySwap(plan, mealId, recipeId, dataset, pantry): WeekPlan;      // recalcule score
toggleLock(plan, mealId): WeekPlan;
// scoring.ts
scorePlan(plan, dataset, pantry, profile): PlanScore;
```

Principe du planificateur : (1) filtrage des recettes éligibles par slot/jour ; (2) remplissage glouton jour par jour avec pénalité de répétition (même recette, même cuisine 2 jours de suite, même protéine principale consécutive) et bonus si la recette consomme un ingrédient périssable déjà "ouvert" par un repas précédent ; (3) doublage automatique des recettes `leftoverFriendly` pour créer un déjeuner du lendemain (`leftoverOfMealId`) selon le temps disponible ; (4) recherche locale : N itérations de swap aléatoire (PRNG seedé) acceptées si `scorePlan` augmente. Le tout déterministe pour un `seed` donné.

---

## 3. Store zustand

### Principes
- Un seul store `useAppStore` composé de 5 slices (pattern `StateCreator<AppState, [['zustand/persist', unknown]], [], Slice>`).
- **La liste de courses n'est jamais stockée** : elle est dérivée à la volée par `buildShoppingList(plan, pantry, dataset, checked, manual, today)`. Seuls l'état "coché" et les ajouts manuels sont persistés.
- Le dataset (recettes/ingrédients) n'est pas dans le store : import statique depuis `src/data`.
- Les actions ne contiennent pas de logique : elles appellent le core et remplacent l'état (immutabilité, pas d'immer nécessaire).

### Slices

```ts
// profileSlice
interface ProfileSlice {
  profile: UserProfile;                        // valeur par défaut : 2 pers., omnivore, equilibre, 30/60 min
  setProfile: (patch: Partial<UserProfile>) => void;
}

// planSlice
interface PlanSlice {
  currentPlan: WeekPlan | null;
  recentRecipeIds: RecipeId[];                 // 30 derniers, pour la variété inter-semaines
  generatePlan: (weekStart?: ISODate, seed?: number) => void;   // lit profile + pantry, appelle generateWeekPlan
  regenerateUnlocked: () => void;              // conserve locked=true
  swapMeal: (mealId: PlannedMealId, recipeId: RecipeId) => void;
  toggleLock: (mealId: PlannedMealId) => void;
  clearPlan: () => void;
}

// shoppingSlice — uniquement ce qui n'est pas dérivable
interface ShoppingSlice {
  checked: Record<string, boolean>;            // clé `${weekPlanId}:${ingredientId}`
  manualItems: Record<WeekPlanId, ManualShoppingItem[]>;
  toggleChecked: (weekPlanId: WeekPlanId, ingredientId: IngredientId) => void;
  addManualItem: (weekPlanId, item: ManualShoppingItem) => void;
  removeManualItem: (weekPlanId, ingredientId) => void;
  resetChecked: (weekPlanId) => void;
  /** Après les courses : transfère les surplus (Leftover) au garde-manger. */
  commitSurplusToPantry: (leftovers: readonly Leftover[]) => void;
}

// pantrySlice
interface PantrySlice {
  pantry: PantryItem[];
  upsertPantryItem: (item: PantryItem) => void;
  removePantryItem: (ingredientId: IngredientId) => void;
  consumePantry: (ingredientId, quantity) => void;
  purgeExpired: (today: ISODate) => void;
}

// settingsSlice
interface SettingsSlice {
  hasOnboarded: boolean;
  themeMode: 'system' | 'light' | 'dark';
  hapticsEnabled: boolean;
  setSetting: <K extends keyof SettingsValues>(k: K, v: SettingsValues[K]) => void;
}

export type AppState = ProfileSlice & PlanSlice & ShoppingSlice & PantrySlice & SettingsSlice;
```

### Persistance (src/store/storage.ts + index.ts)

```ts
export const STORE_KEY = 'wsf-store';
export const STORE_VERSION = 1;

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({ ...createProfileSlice(...a), ...createPlanSlice(...a), ...createShoppingSlice(...a),
                 ...createPantrySlice(...a), ...createSettingsSlice(...a) }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        profile: s.profile, currentPlan: s.currentPlan, recentRecipeIds: s.recentRecipeIds,
        checked: s.checked, manualItems: s.manualItems, pantry: s.pantry,
        hasOnboarded: s.hasOnboarded, themeMode: s.themeMode, hapticsEnabled: s.hapticsEnabled,
      }),
      migrate: migrateState,        // (persisted: unknown, version: number) => PersistedState
    },
  ),
);
```

- `migrations.ts` : table `{ 0: v0→v1, … }` appliquée en chaîne ; chaque migration testée. Au moindre doute (état corrompu, plan référençant un `recipeId` inconnu après mise à jour du dataset), `currentPlan` est remis à `null` plutôt que de planter.
- Hydratation : `useHydrated()` s'appuie sur `useAppStore.persist.onFinishHydration` + `hasHydrated()` ; `app/_layout.tsx` maintient `SplashScreen` jusqu'à hydratation pour éviter un flash "onboarding".

### Sélecteurs dérivés (src/store/selectors.ts, hooks.ts)

```ts
// selectors purs (testables sans React)
export const selectPlan = (s: AppState) => s.currentPlan;
export const selectPantry = (s: AppState) => s.pantry;
export const selectChecked = (s: AppState) => s.checked;
export const selectManual = (s: AppState) => s.manualItems;

// hook : recalcul uniquement si une des entrées change (références immuables)
export function useShoppingList(today = todayISO()): ShoppingList | null {
  const plan = useAppStore(selectPlan);
  const pantry = useAppStore(selectPantry);
  const checked = useAppStore(selectChecked);
  const manual = useAppStore((s) => (plan ? s.manualItems[plan.id] ?? EMPTY : EMPTY));
  return useMemo(
    () => (plan ? buildShoppingList(plan, pantry, DATASET, checked, manual, today) : null),
    [plan, pantry, checked, manual, today],
  );
}
export function useDayNutrition(date: ISODate): NutritionInfo | null;   // même schéma
export function useSwapCandidates(mealId: PlannedMealId): SwapCandidate[];
```

Ne jamais retourner d'objet neuf depuis un sélecteur zustand (boucle de rendu) : sélectionner les références brutes puis dériver dans `useMemo`, ou utiliser `useShallow` pour des tuples.

---

## 4. Stratégie de tests

- Preset **jest-expo** (un seul projet, pas de matrice ios/android : le core est indépendant de la plateforme).
- Tests unitaires du core = la majorité de la suite ; rapides (< 2 s), sans React. Chaque module core a son fichier de test avec le mini-dataset des fixtures, plus un test de dataset réel (`dataset.test.ts`) qui valide l'intégrité des 60+ recettes.
- Propriétés à tester en priorité :
  - `units` : conversions exactes (tbsp→ml, kg→g, piece→g via `conversions`), erreur si non convertible, formatage FR.
  - `aggregate` : deux recettes utilisant le même ingrédient en unités différentes → une seule ligne, somme correcte ; `optional` exclu ; repas `leftoverOfMealId` non comptés deux fois.
  - `packs` : 380 g de pâtes → 1 paquet de 500 g, surplus 120 g ; 5 œufs → 1 boîte de 6 ; 0 g → 0 pack.
  - `pantry` : déduction, périmé ignoré, staples exclus, stock partiel.
  - `waste` : plan A (crème utilisée 1 fois) < plan B (crème utilisée 2 fois).
  - `planner` : même seed ⇒ même plan ; aucune recette non éligible (régime/allergène/aversion/temps) ; 7 jours × slots demandés ; verrous respectés ; `applySwap` conserve les autres repas et met à jour le score.
  - `shopping` : bout-en-bout, `totalCostEur` = somme, `checked` fusionné, extras manuels présents.
  - `store` : actions, `partialize` n'écrit jamais de liste de courses, migrations v0→v1.
- Snapshot minimal : un composant feuille (`ShoppingRow`) avec `@testing-library/react-native` (`render`, `fireEvent.press`) — pas de snapshot d'écran complet (fragile).
- Coverage ciblé : `src/core/**` à 90 %+, seuil configuré.

`package.json` (extraits) :

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "expo lint",
    "doctor": "npx expo-doctor",
    "check": "npm run typecheck && npm run lint && npm run test:ci",
    "export:check": "expo export --platform android --output-dir .export-check"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
    "testMatch": ["<rootDir>/__tests__/**/*.test.(ts|tsx)"],
    "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" },
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|zustand)"
    ],
    "collectCoverageFrom": ["src/core/**/*.ts", "src/store/**/*.ts", "!src/**/index.ts"],
    "coverageThreshold": { "global": { "lines": 80 }, "./src/core/": { "lines": 90 } }
  }
}
```

`jest.setup.ts` :

```ts
import '@testing-library/react-native/extend-expect';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), selectionAsync: jest.fn(),
  notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
```

---

## 5. Dépendances exactes

Toujours via `npx expo install <pkg>` (résout la version compatible avec le SDK installé) ; ne pas figer de versions à la main. Versions indicatives pour un SDK 54/55 (React 19, RN 0.81+) :

| Paquet | Type | Justification |
|---|---|---|
| `zustand` (^5) | dep | État global minimal, middleware `persist` intégré, sans boilerplate ; compatible React 19 / React Compiler. |
| `@react-native-async-storage/async-storage` (2.x) | dep | Storage clé/valeur natif requis par la contrainte ; module Expo-compatible, mock jest officiel. |
| `expo-haptics` | dep | Retour haptique au cochage d'un article et au swap ; module Expo natif léger, no-op sur web. |
| `jest-expo` (aligné SDK, ex. ~54.x) | devDep | Preset jest officiel (transform babel-preset-expo, mocks natifs). |
| `jest` (~29.7) | devDep | Runner (peer de jest-expo ; `expo install` choisit la version). |
| `@testing-library/react-native` (^13) | devDep | Tests de composants avec API par comportement (React 19 requis ⇒ v13). Si un warning peer réclame `react-test-renderer`, l'installer exactement à la version de `react`. |
| `@types/jest` | devDep | Typage des globals `describe/it/expect` dans TS strict. |

Déjà présents dans le template (ne pas réinstaller) : `expo-router`, `react-native-reanimated`, `react-native-worklets` (SDK 54+), `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `expo-splash-screen`, `expo-status-bar`, `expo-font`, `expo-linking`, `expo-constants`, `@expo/vector-icons`, `eslint-config-expo`, `typescript`.

Volontairement exclus : `immer` (état petit, spreads suffisent), `date-fns` (helpers maison sur ISODate), `react-hook-form`, `i18next` (un seul locale), `expo-sqlite` (AsyncStorage + JSON < 100 Ko suffit), `react-native-mmkv` (nécessite dev build ; AsyncStorage marche en Expo Go).

Commande unique :

```
npx expo install zustand @react-native-async-storage/async-storage expo-haptics
npx expo install jest-expo jest @testing-library/react-native @types/jest -- --save-dev
```

---

## 6. Conventions pour agents parallèles et checklist d'intégration

### Ordre et propriété des fichiers (fichiers DISJOINTS)

| Phase | Agent | Fichiers possédés (exclusifs) | Dépend de |
|---|---|---|---|
| 0 | Architecte | `src/core/types.ts`, `src/core/constants.ts`, `src/i18n/fr.ts` (clés), `package.json` scripts/jest, `jest.setup.ts`, `tsconfig.json` | — (figés AVANT le lancement des autres) |
| 1a | Data-ingredients | `src/data/ingredients.ts` | types |
| 1b | Data-recipes | `src/data/recipes/*.ts`, `src/data/validate.ts`, `__tests__/data/*` | types + **liste d'ids d'ingrédients** publiée par 1a (convention : ids en snake_case FR sans accent : `tomate`, `creme_fraiche`, `oeuf`, `pates_penne`). 1b crée les ids manquants dans un fichier `src/data/ingredients.extra.ts` fusionné à l'intégration, jamais en éditant `ingredients.ts`. |
| 1c | Core-units/aggregate | `units.ts`, `scaling.ts`, `aggregate.ts`, `packs.ts`, `pantry.ts`, `date.ts`, `random.ts` + tests associés, `__tests__/fixtures/*` | types |
| 1d | Core-planner | `filters.ts`, `nutrition.ts`, `scoring.ts`, `waste.ts`, `leftovers.ts`, `planner.ts`, `shopping.ts` + tests | types + signatures publiées de 1c (les tests de 1d utilisent les fixtures, pas le dataset réel) |
| 2 | Store | `src/store/**`, `__tests__/store/*` | core/index.ts (signatures) |
| 3a | UI-theme+ui | `src/theme/**`, `src/components/ui/**`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/+not-found.tsx` | store hooks (noms figés en phase 0) |
| 3b | UI-plan | `app/(tabs)/index.tsx`, `app/recipe/[id].tsx`, `app/swap/[mealId].tsx`, `src/components/plan/**` | 3a primitives (peuvent démarrer avec `View/Text` bruts puis migrer) |
| 3c | UI-shopping+pantry | `app/(tabs)/shopping.tsx`, `app/(tabs)/pantry.tsx`, `src/components/shopping/**`, `src/components/pantry/**` | idem |
| 3d | UI-profile+onboarding | `app/(tabs)/profile.tsx`, `app/onboarding.tsx`, `src/components/profile/**` | idem |

Règles :
1. **Un fichier = un propriétaire.** Les barrels (`src/core/index.ts`, `src/data/recipes/index.ts`, `src/components/ui/index.ts`) sont écrits par l'intégrateur à la fin, ou pré-créés en phase 0 avec la liste d'exports attendue.
2. Personne ne modifie `types.ts` après la phase 0. Un besoin de type supplémentaire ⇒ type local au module, remonté à l'intégrateur.
3. Imports par alias `@/src/...` uniquement (pas de `../../`), pour que les fichiers soient déplaçables.
4. Chaque agent livre avec `tsc --noEmit` vert **sur ses fichiers** (les stubs manquants sont autorisés via des fichiers `*.stub.ts` dans son propre périmètre, jamais dans celui d'un autre).
5. Pas de `any`, pas de `!` non justifié, `readonly` partout dans les données ; `exactOptionalPropertyTypes` non activé (compat expo tsconfig).
6. Données : chaque recette référence uniquement des ids présents dans `ingredients.ts` ou `ingredients.extra.ts` ; unités limitées au type `Unit` ; le test `dataset.test.ts` fait foi.
7. Le core ne fait pas d'I/O, pas de `Date.now()` ni `Math.random()` : `today` et `seed` sont passés en paramètre.

### Checklist d'intégration finale
1. `npm install` propre (supprimer `node_modules` + lockfile si conflits de versions), puis `npx expo install --check` / `--fix`.
2. `npx tsc --noEmit` : 0 erreur.
3. `npm run lint` : 0 erreur (warnings tolérés documentés).
4. `npm run test:ci` : 100 % vert, seuils de couverture respectés, `dataset.test.ts` confirme ≥ 60 recettes, tous les slots et tous les régimes couverts.
5. `npx expo-doctor` : 15/15 checks (versions alignées, pas de dépendance dupliquée, `app.json` valide).
6. `npx expo export --platform android` puis `--platform ios` : le bundle Metro se construit (détecte imports cassés, routes invalides, plugins babel manquants) ; supprimer le dossier de sortie ensuite.
7. `npx expo start` + Expo Go / émulateur : onboarding → génération → swap → liste recalculée → cocher → garde-manger → régénération avec verrous.
8. Vérifier la persistance : tuer l'app, relancer, état restauré ; puis bump `STORE_VERSION` factice pour exercer `migrate` une fois.
9. Vérifier le mode sombre et les tailles de police dynamiques sur au moins un écran.

---

## 7. Pièges connus (Expo / expo-router / Windows)

**Windows et chemin avec espaces (`WSF-Week Shop Food`)**
- Metro, Gradle (`expo run:android`) et certains scripts npm échouent ou se comportent mal avec des espaces dans le chemin. `expo start` + Expo Go fonctionne généralement, mais un dev build Android échouera. Remède : travailler depuis une jonction sans espace (`mklink /J C:\dev\wsf "C:\Users\fazil\Desktop\WSF-Week Shop Food"`) ou renommer le dossier ; toujours entourer les chemins de guillemets dans les scripts.
- Longueur des chemins : activer les long paths Windows si `node_modules` dépasse 260 caractères (`git config core.longpaths true` et clé registre `LongPathsEnabled`).
- Ne pas mettre le projet sous OneDrive/Desktop synchronisé si possible : verrous de fichiers sur `.expo/` et `node_modules/.cache`.
- PowerShell : `npx expo ...` peut être bloqué par la politique d'exécution (`npx.ps1`) ; utiliser `npx.cmd` ou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Fin de lignes : `.gitattributes` avec `* text=auto eol=lf` pour éviter que ESLint/Prettier hurlent en CRLF.
- Pare-feu : Expo Go sur téléphone nécessite le port 8081 autorisé ou `expo start --tunnel`.

**expo-router**
- Tout fichier dans `app/` est une route : jamais de composants, hooks ou tests dans `app/`. Les fichiers utilitaires doivent être dans `src/`.
- `app/_layout.tsx` doit exporter un composant par défaut ; les routes dynamiques `[id].tsx` reçoivent des `string` via `useLocalSearchParams<{ id: string }>()` — caster en `RecipeId` avec `asRecipeId`.
- Routes typées : `expo-router` génère `.expo/types/router.d.ts` ; ne pas commiter `.expo/`. Utiliser `router.push({ pathname: '/recipe/[id]', params: { id } })`.
- Les modals (`swap/[mealId]`) se déclarent dans le `Stack` du root layout avec `presentation: 'modal'`.
- Ne pas envelopper le root layout dans un `NavigationContainer` (géré par expo-router).

**Reanimated / babel**
- Le template n'a pas de `babel.config.js` ; s'il faut en créer un, contenu unique : `module.exports = (api) => { api.cache(true); return { presets: ['babel-preset-expo'] }; }`. Ne PAS ajouter manuellement `react-native-reanimated/plugin` (SDK 54+ : le plugin worklets est injecté par babel-preset-expo ; l'ajouter deux fois casse le build). Après tout changement babel : `npx expo start --clear`.
- Reanimated doit rester à la version que `expo install` impose ; `expo-doctor` signalera tout écart.

**AsyncStorage**
- Sur web, AsyncStorage s'appuie sur `localStorage` (SSR : accès uniquement côté client ; `expo export --platform web` peut planter si le store est lu au niveau module — le lire dans des hooks/effets).
- En jest, toujours le mocker (`jest/async-storage-mock`) sinon "NativeModule: AsyncStorage is null".
- Limite pratique ~6 Mo sur Android par défaut ; notre état reste < 200 Ko. Un seul JSON pour tout le store (clé `wsf-store`), pas de multi-clés.
- L'hydratation zustand est asynchrone : tout rendu avant `hasHydrated()` voit l'état par défaut (risque de redirection vers l'onboarding). Gate obligatoire dans `_layout.tsx`.

**zustand**
- v5 : `create<T>()(…)` avec la double parenthèse pour les middlewares typés ; sélecteurs qui renvoient de nouveaux objets/tableaux ⇒ boucle infinie (utiliser `useShallow` ou dériver dans `useMemo`).
- `persist` + `migrate` : `version` doit être bumpée à chaque changement de forme des données persistées, sinon l'ancien état est fusionné tel quel (merge superficiel par défaut).
- React Compiler (activé sur les nouveaux projets SDK 54+) : ne jamais muter l'état ; retourner de nouveaux objets (déjà la règle du core).

**jest / jest-expo**
- `transformIgnorePatterns` doit lister les paquets ESM (`zustand` notamment) sinon "SyntaxError: Unexpected token export".
- `moduleNameMapper` pour l'alias `@/` (Metro lit `tsconfig.paths`, jest non).
- Sur Windows, les patterns `testMatch` sont en slashs `/` ; jest les normalise, ne pas utiliser `\\`.
- Les tests core doivent rester purs : un import accidentel de `react-native` dans `src/core` fera charger tout le preset et ralentira x10 (lint rule `no-restricted-imports` sur `src/core/**`).
- Les snapshots de composants incluant des icônes `@expo/vector-icons` sont bruyants : mocker `@expo/vector-icons` dans `jest.setup.ts` si un snapshot les contient.

**Hermes / dates / locale**
- `toLocaleDateString('fr-FR')` fonctionne sur Hermes récent mais le format varie selon l'OS ; les libellés de jours/mois sont pris dans `i18n/fr.ts` et les dates manipulées en `ISODate` local (jamais `new Date('YYYY-MM-DD')` qui est UTC ⇒ décalage de jour le soir). Construire via `new Date(y, m-1, d)`.
- `Number.toFixed`/`Intl.NumberFormat` : formater les prix avec un helper maison (`1,50 €`) pour éviter les divergences Android/iOS.

**Divers Expo**
- `newArchEnabled: true` par défaut : toutes les libs listées sont compatibles ; ne pas ajouter de lib non maintenue.
- `expo export` échoue sur les imports dynamiques de routes ou les `require()` conditionnels de fichiers de données : garder les imports de `src/data` statiques.
- Expo Go ne supporte que les modules inclus dans le SDK : tout ce qui est listé ici (AsyncStorage, Haptics, Reanimated) y est ; éviter tout module natif tiers pour rester testable sans dev build.
- `app.json` : définir `scheme` (deep links expo-router), `userInterfaceStyle: "automatic"` (mode sombre), `android.package` / `ios.bundleIdentifier` en `com.wsf.weekshopfood` dès le départ pour éviter les prompts de prebuild.
