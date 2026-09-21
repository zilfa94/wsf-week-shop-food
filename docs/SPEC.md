# SPEC — WSF · Week Shop Food (v1)

> **Spécification définitive.** Elle arbitre les trois propositions de conception conservées dans `docs/conception/` (`proposition-ux.md`, `proposition-algo.md`, `proposition-eng.md`) et ne répète pas leur détail : elle dit **ce qui est retenu, ce qui change, ce qui est reporté**. En cas de divergence : cette spec > propositions. Le contrat de données est **`src/core/types.ts`** (commenté, il fait foi sur les noms) ; les décisions techniques figées sont dans `CLAUDE.md` § 2.
>
> Statut : rédigée le 2026-09-19 par l'agent principal (mode économe, CLAUDE.md § 0.1) après l'échec du juge de synthèse. Mise à jour à chaque arbitrage nouveau (§ 8).

---

## 1. Produit

### 1.1 Promesse

« **Une semaine de vrais plats, une seule liste, zéro reste orphelin.** » L'app compose 7 jours de repas (petit-déjeuner, déjeuner, dîner, collation optionnelle) adaptés au foyer, en génère la liste de courses **arrondie aux conditionnements réels**, et rend visible ce qui restera et comment l'utiliser. 100 % hors-ligne, français.

### 1.2 Parcours (référence : `proposition-ux.md` § 1, retenu avec les adaptations ci-dessous)

1. **Onboarding** en 6 étapes (personnes, régime, allergies, objectif, temps, aversions) — un seul écran `onboarding.tsx` avec étapes internes (pas 7 routes). Défauts : 2 personnes, omnivore, aucune allergie, équilibre, 30 min semaine / 90 min week-end, petit-déjeuner oui, collation non.
2. **Génération** : écran plein avec 3 messages successifs ; la génération est synchrone (< 300 ms) et lancée dans `InteractionManager.runAfterInteractions`.
3. **Semaine** : bandeau 7 jours, 3 tuiles (budget estimé · articles à acheter · score anti-gaspi), 7 sections de cartes repas ; actions : remplacer, verrouiller, marquer cuisiné, régénérer (garde verrouillés + cuisinés).
4. **Jour**, **Recette** (stepper de portions → « Appliquer à mon plan »), **Courses** (par rayon, « À acheter : 1 paquet de 500 g · Besoin réel : 380 g · reste ~120 g → réutilisé jeudi »), **Détail article** (changer le pack, « J'en ai déjà », retirer), **Mode magasin**, **Garde-manger** (ajout, péremption, décompte au « cuisiné »), **Cuisiner avec ce que j'ai**, **Swap à impact**, **Bilan de semaine**, **Profil**.

### 1.3 Routes `src/app/` (expo-router, décision figée : `src/app/`, `Tabs` classiques)

| Route | Présentation | Rôle | Lit (store) / appelle (core) |
|---|---|---|---|
| `_layout.tsx` | Stack racine | thème, **gate d'hydratation** (splash tant que `persist.hasHydrated()` est faux), redirection onboarding, déclaration des modales | `useHydrated`, `settings.themeMode` |
| `index.tsx` | — | `Redirect` vers `/(tabs)` ou `/onboarding` | `settings.hasOnboarded` |
| `onboarding.tsx` | plein écran | 6 étapes internes, écrit le profil, lance la génération | `setProfile`, `generatePlan` |
| `generating.tsx` | modal | 3 messages puis retour Semaine | `generatePlan` |
| `(tabs)/_layout.tsx` | Tabs | Semaine · Courses · Garde-manger · Profil (Ionicons `calendar` / `cart` / `file-tray-stacked` / `person`, badge courses = articles restants) | `useShoppingList` |
| `(tabs)/index.tsx` | onglet | Semaine | `currentPlan`, `useShoppingList`, `useWeekNutrition` |
| `(tabs)/shopping.tsx` | onglet | Liste de courses + restes prévisibles + ajout manuel | `useShoppingList`, `toggleChecked`, `addManualItem` |
| `(tabs)/pantry.tsx` | onglet | Garde-manger | `pantry`, `usePantryAlerts`, `removePantryItem` |
| `(tabs)/profile.tsx` | onglet | Profil + réglages + données (sections internes) | `profile`, `settings`, `setProfile`, `resetAll` |
| `day/[day].tsx` | stack | Jour (0..6) : macros du jour, repas larges | `useDayNutrition(day)` |
| `recipe/[id].tsx` | stack (`presentation: 'card'`) | Recette : ingrédients à l'échelle + statut (garde-manger / à acheter / reste), étapes, nutrition | `useRecipeStatus(id)`, `setMealServings` |
| `swap/[mealId].tsx` | modal | 3-5 alternatives avec delta liste, filtres, undo 5 s | `useSwapSuggestions(mealId)`, `swapMeal`, `undoSwap` |
| `item/[ingredientId].tsx` | formSheet | Détail article, changer le pack, j'en ai déjà, retirer | `setPackChoice`, `markHaveAlready` |
| `store-mode.tsx` | modal plein écran | Cocher vite : un rayon par page, police ×1,25 | `useShoppingList`, `toggleChecked` |
| `pantry-add.tsx` | formSheet | Recherche locale + quantité + date | `upsertPantryItem` |
| `cook-with.tsx` | stack | Recettes faisables avec le garde-manger | `useCookWithPantry` |
| `report.tsx` | modal | Bilan de semaine, « Composer la semaine suivante » | `useWeekReport`, `startNextWeek` |

Toutes les modales sont déclarées dans le `Stack` racine avec `presentation: 'modal'` ou `'formSheet'` (pas de librairie bottom-sheet).

### 1.4 Périmètre v1 / v2

Retours du propriétaire après le premier test sur téléphone (2026-09-20) : onboarding réduit à 5 étapes (**Foyer** = personnes + repas à planifier parmi petit-déjeuner / déjeuner / dîner / collation, au moins un repas principal ; **Régime** = base omnivore / végétarien / végétalien / pescétarien + restriction « sans porc » ; l'étape « Temps en cuisine » disparaît de l'onboarding et reste un réglage optionnel du Profil).

**Cuisines préférées (demande du propriétaire, 2026-09-21)** : nouvelle étape d'onboarding « Vos cuisines préférées » (après le régime) et section du Profil. `UserProfile.preferredCuisines: Cuisine[]` (`[]` = toutes). Le choix porte sur des **familles** (`core/cuisines.ts` : française ← nordique ; méditerranéenne ← italienne ; asiatique ← indienne ; orientale ; mexicaine / américaine / autre = neutres) et seules les familles comptant ≥ 5 déjeuners / dîners sont proposées (`selectableCuisines`, avec le nombre de plats affiché : aujourd'hui asiatique 12, française 12, méditerranéenne 12, orientale 7). C'est une **préférence forte, pas une exclusion** : le planificateur ajoute `PlannerParams.cuisinePenalty` (2, pondéré par le poids variété 1,5) à chaque déjeuner / dîner hors préférences, si bien que ces plats n'apparaissent que lorsque les cuisines choisies ne suffisent pas à varier la semaine (une seule famille de 12 plats pour 14 créneaux, par exemple) ; les petits-déjeuners et collations ne sont pas concernés. Le remplacement d'un repas hérite de la pénalité (raison « Hors de vos cuisines préférées ») ; changer ses cuisines est une dérive de profil signalée sur la Semaine (`ProfileDrift 'cuisines'`). Store version 4.

| v1 (à livrer) | v2 (reporté, pourquoi) |
|---|---|
| — | **Prix réels par magasin — DÉCIDÉ le 2026-09-20 (propriétaire : « la meilleure solution gratuite → scraping avec backend »).** Constat vérifié : aucune API publique chez les enseignes ; les comparateurs (Que Choisir, Reprice…) scrapent les sites drive ; Carrefour répond 403 à un robot simple (anti-bot), Auchan affiche ses produits (prix après choix du magasin). Architecture : `scraper/` (Node + Playwright, un robot par enseigne, liste de magasins suivis, ~150 requêtes = nos ingrédients avec `Ingredient.priceQueries` par enseigne) → GitHub Actions cron → `prices/<store>.json` sur GitHub Pages → `src/services/prices.ts` (téléchargement, cache AsyncStorage, horodatage) → core `prices.ts` pur (prix par magasin, total du panier par magasin, panier le moins cher, repli `Packaging.price`) → écran « Où acheter ». Ordre : (1) le propriétaire fournit ses magasins (ville, enseignes) et un dépôt GitHub ; (2) robot Auchan d'abord, puis Leclerc / Intermarché / Lidl sondés un par un ; (3) service + core + écran. Alternative gardée en réserve : Open Prices (Open Food Facts, API ouverte, 314 k prix) comme source complémentaire. |
| — | **Mode cuisine guidé** : une étape par écran, minuteur intégré (`expo-notifications`, v2 déjà prévu). |
| — | **Astuces budget** : bouton « Faire baisser le coût » proposant les swaps aux plus fortes économies (le core les calcule déjà : `suggestSwaps` trié par `deltaPrice`), y compris des options plus simples (sandwich, plat économique moins équilibré) avec affichage de l'impact sur le score d'équilibre ; filtres « Moins cher / Plus rapide / Avec mes restes » sur l'écran de swap. |
| Tout le § 1.2 sauf colonne de droite | **Minuteur d'étape + notifications** (`expo-notifications`, permissions, limites Expo Go) |
| Score anti-gaspi, restes prévisibles, swap à impact, batch cooking | **Import/export de profil**, partage texte de la liste (simple, mais après le reste) |
| Mode magasin (sans `expo-keep-awake` : ajout possible en v1.1, justifié dans AVANCEMENT.md) | **Anneau SVG** (`react-native-svg`) : v1 utilise `MacroBar` + tuiles numériques |
| Thème clair/sombre/système, haptique | **Illustrations par cuisine** : v1 = pastille colorée + initiale |

### 1.5 Microcopy

Référence : `proposition-ux.md` § 3, retenue intégralement. Deltas : « Végétalien » (pas « végan ») ; unités affichées via `labels.ts` (`c. à s.`, `c. à c.`, `gousse(s)`) ; prix « 1,50 € » via `formatPrice`. Les messages anti-gaspi sont **générés** par `leftovers.ts` / `swap.ts` (champ `reasons`), jamais codés en dur dans les écrans.

---

## 2. Contrat de types — arbitrages

`src/core/types.ts` fusionne le modèle « algo » (§ 1 de `proposition-algo.md`) et le modèle « ingénierie » (§ 2 de `proposition-eng.md`).

| Sujet | Algo | Ingénierie | **Retenu** | Pourquoi |
|---|---|---|---|---|
| Identifiants | `string` | brandés (`IngredientId & {__brand}`) | **`string` aliasés** + test d'intégrité | 60 recettes et 150 ingrédients seront écrits par des agents : zéro friction, l'intégrité est testée |
| Valeurs d'énumérations | anglais | français | **anglais** (`'breakfast'`, `'fruits_vegetables'`, `'vegan'`) + `labels.ts` | CLAUDE.md § 2 (identifiants en anglais) |
| Régimes d'une recette | dérivés des tags d'ingrédients | déclarés (`diets`) | **dérivés de `foodClass`** (`filter.ts`) | une seule source de vérité, pas de contradiction possible |
| Allergènes | 11 | 12 | **les 14 légaux UE** | l'onboarding n'en propose que 8 (`ONBOARDING_ALLERGENS`) |
| Conditionnement | `Packaging {kind, size, price, label}` | `Pack {size, unit, label}` + `priceEurPerPack` | **`Packaging`** + `altPackagings?` | permet « Changer le pack » et le vrac |
| Rayons | 11 | 19 | **11** | assez pour le parcours magasin, moins d'erreurs de saisie |
| Repas | `Meal {slot, recipeId, servings, locked, leftoverOf}` | `PlannedMeal {id, …}` + `DayPlan[]` | **`Meal` à plat** avec `id = slotKey` (`'3-lunch'`) + **`cooked`** | id stable sans générateur, requis par les routes / verrous / undo ; « cuisiné » manquait dans les deux |
| Plan | `cost: CostBreakdown` | `score: PlanScore 0..100` | **`cost`** (planificateur) ; les scores 0..100 sont dans `ShoppingList.wasteScore` et `DayNutrition.score` | coût pour optimiser, score pour afficher |
| Créneaux impossibles | `null` dans la matrice | — | **`WeekPlan.unfilled: MealSlot[]`** | l'UI doit les montrer, pas planter |
| Article libre | — | `ManualShoppingItem {ingredientId, packs}` | **`ManualItem {label, aisle, price?}`** sans ingrédient | « papier alu » n'est pas un ingrédient |
| État persisté | `Map` dans le contexte | JSON | **JSON pur** (aucune `Map`/`Set`/`Date` dans les types) ; `Map` uniquement dans `PlanContext`/`PlanState` internes | AsyncStorage |
| Nutrition | `Macros` + `NutritionTarget.perMeal` | `NutritionInfo` (fiber optionnel) | **`Macros` avec `fiber` obligatoire** | la pénalité fibres en a besoin |
| Paramètres | `params.ts` | `constants.ts` | **`params.ts`** + `PlannerParamsOverride` | surcharge partielle testable |

---

## 3. Données (`src/data/`)

### 3.1 Fichiers

| Fichier | Export | Contenu |
|---|---|---|
| — | `AISLE_ORDER` vit dans **`src/core/aisles.ts`** (le core ne dépend pas des données) | ordre de parcours : `fruits_vegetables, bakery, butcher, fish, dairy, dry_goods, condiments, sweet_grocery, drinks, frozen, other` |
| `ingredients.ts` | `INGREDIENTS: readonly Ingredient[]` | ~150 ingrédients, groupés par rayon dans le fichier |
| `recipes-breakfast.ts`, `recipes-snacks.ts`, `recipes-french.ts`, `recipes-mediterranean.ts`, `recipes-asian.ts`, `recipes-oriental.ts`, `recipes-veggie.ts` | `RECIPES_<GROUPE>: readonly Recipe[]` | recettes par groupe (voir quotas § 3.3) |
| `recipes.ts` | `RECIPES: readonly Recipe[]` | concaténation |
| `index.ts` | `DATASET: Dataset`, `DATASET_VERSION` (`'2026.09.1'`, à incrémenter à chaque modification) | point d'entrée unique |
| `__tests__/dataset.test.ts` | — | invariants § 3.4 |

Format : un objet par recette/ingrédient, **`id:` en première ligne de l'objet** (le compteur de `scripts/docs.mjs` s'en sert), `as const satisfies` interdit (types explicites `Ingredient`/`Recipe`).

### 3.2 Conventions

- **Ids** : snake_case français sans accent : `creme_fraiche`, `oeuf`, `pates_penne`, `poulet_blanc`, `tomates_pelees`. Un ingrédient = une forme d'achat (`poulet_blanc` ≠ `poulet_cuisse`).
- **Unité canonique** : `g` pour tout ce qui se pèse, `ml` pour les liquides, `piece` pour ce qui se compte (œufs, citrons, yaourts, tomates → non : tomate en `g` avec `conversions.piece`). Règle : `piece` uniquement si l'achat et la recette comptent en pièces.
- **Conversions obligatoires** quand une recette peut utiliser l'unité : `tomate {piece: 120}`, `oignon {piece: 150}`, `ail {clove: 5, piece: 40}`, `citron {piece: 1}` (canonique piece), `persil/coriandre/basilic {bunch: 30, tbsp: 4}`, `farine {tbsp: 8, tsp: 3}`, `sucre {tbsp: 12, tsp: 4}`, `riz {tbsp: 12}`, `pain_mie {slice: 25}`, `tomates_pelees {can: 400}`, `pois_chiches {can: 265}`, `lait_coco {can: 400}`, `beurre {tbsp: 15}`, `huile_* {tbsp: 15, tsp: 5}` (déjà par défaut pour `ml`).
- **Conditionnements** : réels du commerce français, prix indicatifs 2026 (grande surface) : pâtes 500 g 1,20 € ; riz 1 kg 2,20 € ; œufs ×6 2,10 € (alt ×12) ; lait 1 L 1,10 € ; crème 20 cl 1,00 € ; beurre 250 g 2,60 € ; poulet vrac 100 g 1,20 € ; bœuf haché 350 g 4,50 € ; saumon vrac 100 g 2,50 € ; légumes frais **vrac au pas de 100 g** sauf botte/pièce ; herbes botte 30 g 0,90 €.
- **Périssabilité** (`shelfLifeDays`) : herbes 4, poisson 2, viande 3, crème/lait ouvert 5, yaourts 14, œufs 28, fromage 21, légumes 6-14 selon, conserves/pâtes/riz 365.
- **Staples** (`staple: true`, dans `condiments` ou `dry_goods`) : sel, poivre, huile d'olive, huile neutre, vinaigre, moutarde, sucre, farine, épices sèches. Toujours listés dans `staplesToCheck`.
- **`foodClass`** : `plant` par défaut ; `egg`, `dairy` (lait, beurre, fromage, yaourt, crème), `honey`, `fish`, `shellfish`, `poultry`, `beef`, `pork` (lardons, jambon, saucisse), `lamb`, `other_meat`.
- **`allergens`** : gluten (blé, pâtes, pain, semoule, boulgour, orge), milk (tout laitage), egg, fish, crustaceans, molluscs, nuts, peanut, soy (tofu, sauce soja), sesame, mustard, celery, sulphites (vin), lupin.

### 3.3 Quotas de recettes (≥ 60, cible 65)

| Fichier | Nombre | Slots | Contraintes |
|---|---|---|---|
| breakfast | 12 | breakfast | ≥ 4 végétaliennes, ≥ 3 sans gluten, ≤ 15 min, macros 300-500 kcal |
| snacks | 8 | snack | ≤ 10 min, 150-300 kcal, ≥ 4 végétaliennes |
| french | 10 | lunch/dinner | 3 batchables, ≥ 2 poisson |
| mediterranean (italien, grec, espagnol) | 10 | lunch/dinner | ≥ 4 végétariennes |
| asian | 8 | lunch/dinner | ≥ 3 sans gluten (riz, nouilles de riz), tofu ≥ 2 |
| oriental (maghreb, levant, indien) | 8 | lunch/dinner | légumineuses ≥ 4, ≥ 3 batchables |
| veggie (végétarien / végétalien) | 9 | lunch/dinner | 100 % végétariennes dont ≥ 6 végétaliennes, ≥ 4 sans gluten |

Règles globales : aucune recette dupliquée par le nom ; **≥ 40 %** des déjeuners/dîners ≤ 30 min ; `mainProtein` réparti (aucune protéine > 30 % des déj/dîners) ; `baseCarb` réparti ; 4 à 10 ingrédients par recette ; `servings` = 2 (petit-déj, collation) ou 4 (plats) ; macros par portion réalistes (plats 450-750 kcal) ; **chaque ingrédient périssable est utilisé par ≥ 2 recettes** (c'est ce qui permet l'anti-gaspi) ; étapes en 4-8 phrases impératives ; `seasons` renseignées quand un légume est saisonnier.

### 3.4 Invariants testés (`dataset.test.ts`)

1. ids uniques (ingrédients, recettes) ; chaque `RecipeIngredient.ingredientId` existe.
2. chaque `(ingrédient, unité)` utilisé est convertible (`toCanonical` ne lève pas).
3. `packaging.size > 0`, `price > 0`, `shelfLifeDays > 0`, `servings ≥ 1`, macros > 0, `prepMin + cookMin > 0` sauf `no_cook`.
4. ≥ 60 recettes ; pour un omnivore (30/90 min) : ≥ 10 candidats par type de créneau tous jours confondus ; pour végétalien + sans gluten : ≥ 7 déjeuners/dîners, ≥ 3 petits-déjeuners.
5. cohérence : une recette taguée `no_cook` a `cookMin === 0` ; une recette `batchable` est un déjeuner/dîner ; `mainProtein` cohérent avec les `foodClass` présents (ex. `poultry` ⇒ un ingrédient `poultry`).
6. chaque ingrédient périssable (`shelfLifeDays ≤ 14`, non staple) apparaît dans ≥ 2 recettes.
7. `AISLE_ORDER` (core) contient chaque `Aisle` exactement une fois ; chaque `aisle` du jeu de données existe.

---

## 4. Logique métier (`src/core/`)

Référence détaillée : `proposition-algo.md` (§ 2 planificateur, § 3 agrégation, § 4 swap, § 5 restes, § 6 nutrition). Ci-dessous les **signatures retenues** (noms du contrat) et les deltas.

### 4.1 Modules livrés (2026-09-19)

`types.ts`, `rng.ts` (mulberry32), `date.ts` (ISO local, `addDays`, `weekdayOf`, `weekStartFor`, `seasonOf`), `units.ts` (`toCanonical`, `formatQuantity`, `formatPrice`), `packaging.ts` (`roundToPackaging` avec `EPS`, `perishFactor`, `unitPrice`, `formatPacks`, `packagingsOf`), `labels.ts`, `params.ts`, `dataset.ts` (`indexIngredients`, `indexRecipes`), `filter.ts` (`isIngredientForbidden`, `isRecipeEligible`, `fitsTime`, `fitsSeason`, `candidatesForSlot`, `slotsForProfile`, `slotKey`).

### 4.2 `nutrition.ts`

```ts
bmrMifflinStJeor(body: BodyInfo): number
computeTarget(profile: UserProfile): NutritionTarget       // défauts par objectif sans body ; plancher 1200 (f) / 1500 (m) ; perMeal somme = kcal
sumMacros(list: readonly Macros[]): Macros
dailyMacros(plan: WeekPlan, recipes: RecipeIndex): Macros[]  // 7 entrées, par personne ; les repas `leftoverOf` comptent (ils sont mangés)
nutritionPenalty(daily: readonly Macros[], target: NutritionTarget): number   // bande ±10 % kcal, ±15 % protéines, fibres < 20 g
dayScore(m: Macros, target: NutritionTarget): number         // 0..100
weekNutrition(plan, recipes, target): DayNutrition[]
weekBalanceScore(days: readonly DayNutrition[], distinctVegetables: number): number  // moyenne + bonus ≤ 5
```

### 4.3 `planner.ts`

```ts
interface PlanContext { recipes; ingredients; profile; pantry: Map<IngredientId, number>; target; needsOf: Map<RecipeId, Map<IngredientId, number>>; macrosOf; candidates: Map<string, RecipeId[]>; params: PlannerParams; season: Season }
interface PlanState { assign: Map<string, RecipeId | null>; used: Set<RecipeId>; needs: Map<IngredientId, number>; ingCost: Map<IngredientId, number>; waste: number }
buildPlanContext(input: GenerateInput): PlanContext
emptyState(slots): PlanState ; stateFromPlan(plan, ctx): PlanState
wasteDelta(st, ctx, recipeId, sign): number ; applyAssign(st, ctx, key, recipeId | null): void
varietyPenalty(st, ctx): number ; totalCost(st, ctx): CostBreakdown
greedyBuild(st, ctx, rng): void ; anneal(st, ctx, rng): PlanState ; applyBatchCooking(st, ctx, rng): PlanState
generateWeekPlan(input: GenerateInput): WeekPlan
```

Deltas vs proposition : `needsOf` calculé pour `profile.persons` **en retirant les ingrédients optionnels interdits** ; les repas `keep` (verrouillés ou cuisinés) sont posés avant le glouton et exclus des mouvements ; un créneau sans candidat va dans `unfilled` ; `Meal.id = slotKey(slot)` ; `WeekPlan.id = ${weekStart}-${seed}` ; poids `budget` = `BUDGET_GOAL_WEIGHT` si `goal === 'budget'` sinon 0 ; « Régénérer » = `seed + 1` (store). Batch cooking : dîner `batchable` doublé (`servings = 2 × persons`) → déjeuner du lendemain `{ recipeId: idem, servings: 0, leftoverOf: dinnerId }`, max `maxBatchPerWeek`. Le coût ne modélise pas le temps de cuisine : une session économisée vaut `params.batchBonus` (2 € par défaut) et le batch est accepté si son surcoût reste sous ce bonus. Un dîner **cuisiné** n'est jamais doublé ; un dîner verrouillé peut l'être. Les besoins d'une recette (`needs.ts : recipeNeeds`) sont partagés avec la liste de courses.

### 4.4 `shopping.ts`

```ts
recipeNeeds(recipe, servings, ingredients, profile): Map<IngredientId, number>   // mise à l'échelle servings / recipe.servings, optionnels interdits retirés
pantryAvailable(pantry, ingredientId, useDate: ISODate): number                  // lignes non périmées à la date d'usage
buildShoppingList(args: { plan; dataset; profile; pantry; checked: Record<string, boolean>; packChoices: Record<string, number>; manualItems: readonly ManualItem[] }): ShoppingList
wasteScore(items: readonly ShoppingItem[]): number                                // 100 × (1 − Σ leftoverValue / Σ price), borné 0..100
diffShoppingLists(before: ShoppingList, after: ShoppingList): { deltaItems: number; deltaPrice: number }
addPurchasesToPantry(pantry, list, purchaseDate, ingredients): PantryItem[]     // articles cochés → lignes `bought` avec expiresAt = date + shelfLifeDays
consumeFromPantry(pantry, needs: ReadonlyMap<IngredientId, number>): PantryItem[]  // FIFO par expiresAt, clamp 0, lignes vides supprimées
```

Clés : `checked` et `packChoices` sont indexés par `${planId}:${ingredientId}`. `items` contient aussi les `packs === 0` (section « Déjà chez vous » dans l'UI) ; `sections` ne contient que `packs > 0`, dans `AISLE_ORDER`, triées par nom ; `manualItems` rangés dans leur rayon. `leftovers` = `suggestLeftoverUses(...)` (§ 4.6) intégré à la liste pour un seul recalcul.

### 4.5 `swap.ts` et `plan-edit.ts`

```ts
suggestSwaps(args: { plan; mealId; dataset; profile; pantry; checked; season; limit?: number }): SwapSuggestion[]   // liste = garde-manger virtuel, cochés = acquis, score = 1 €·newPurchase + Δcoût
applySwap(plan, mealId, recipeId, dataset, profile, pantry, season): WeekPlan     // verrouille le repas, invalide le déjeuner `leftoverOf` lié (repasse en créneau régénéré simple : recette la moins coûteuse), recalcule `cost`
toggleLock(plan, mealId): WeekPlan ; setCooked(plan, mealId, cooked): WeekPlan ; setMealServings(plan, mealId, servings): WeekPlan
mealById(plan, mealId): Meal | undefined
isPlanExpired(plan, today): boolean                       // today > weekStart + 6
profileDrift(plan, profile): ('persons' | 'diet' | 'allergens' | 'dislikes')[]   // écarts avec profileSnapshot
incompatibleMeals(plan, profile, dataset): Meal[]          // repas devenus inéligibles après changement de profil
```

`reasons` (FR) générées : « Utilise vos restes de {nom} », « +{n} article(s) · +{prix} », « −{n} article(s) », « Même temps de cuisson », « Plus rapide ». Undo : le store garde le plan précédent 5 s (`undoSwap`).

### 4.6 `leftovers.ts`

```ts
suggestLeftoverUses(args: { items; plan; dataset; profile; pantry; maxRecipesPerItem?: number }): LeftoverSuggestion[]  // seuils LEFTOVER_MIN_VALUE / RATIO ; `reusedByMealId` si un repas ultérieur du plan consomme le reste
recipeFeasibility(recipe, pantry, ingredients, profile, persons): RecipeFeasibility   // ratio en valeur, manquants en unité canonique
cookWithPantry(dataset, pantry, profile, minRatio = FEASIBILITY_MIN_RATIO): RecipeFeasibility[]   // triés par ratio décroissant
```

### 4.7 `report.ts`

```ts
weekReport(args: { plan; list: ShoppingList; days: readonly DayNutrition[]; dataset }): WeekReport
// savedEur = Σ sur les ingrédients partagés par ≥ 2 repas de (packs si achetés séparément − packs agrégés) × prix
```

### 4.8 Tests du core

Liste de référence : `proposition-algo.md` § 7, adaptée aux noms ci-dessus, avec les fixtures de `src/core/__tests__/fixtures/`. Obligatoires : déterminisme (même seed ⇒ plan identique), aucune recette dupliquée, verrous/cuisinés respectés, `wasteDelta` incrémental == recalcul complet (200 mouvements), recuit ≤ glouton, anti-gaspi (2 recettes partageant une botte battent une 3e), agrégation multi-unités, garde-manger périmé ignoré, staples, optionnels interdits, sections ordonnées, cochés conservés, swap : coché = acquis, batch invalidé ; restes : seuils, recettes du plan exclues ; nutrition : BMR homme 30 ans 180 cm 75 kg = 1 730 ± 1 ; performance : génération < 300 ms sous jest.

---

## 5. Store (`src/store/`)

| Fichier | Contenu |
|---|---|
| `index.ts` | `useAppStore = create<AppState>()(persist(...))`, `STORE_KEY = 'wsf-store'`, `STORE_VERSION = 1` |
| `storage.ts` | `createJSONStorage(() => AsyncStorage)` |
| `migrations.ts` | `migrate(persisted, version)` : table `{0: v0→v1}` ; si `currentPlan.datasetVersion !== DATASET_VERSION` ou une recette du plan est inconnue → `currentPlan = null` (jamais de crash) |
| `slices/profile.ts` | `profile: UserProfile`, `setProfile(patch)` |
| `slices/plan.ts` | `currentPlan`, `previousPlan` (undo), `seed`, `generatePlan({ keepLocked?: boolean })`, `regenerate()`, `swapMeal(mealId, recipeId)`, `undoSwap()`, `toggleLock`, `setCooked` (consomme le garde-manger via `consumeFromPantry`), `setMealServings`, `startNextWeek()`, `clearPlan()` |
| `slices/shopping.ts` | `checked: Record<string, boolean>`, `packChoices: Record<string, number>`, `manualItems: Record<planId, ManualItem[]>`, `toggleChecked`, `setPackChoice`, `addManualItem`, `toggleManualItem`, `removeManualItem`, `markHaveAlready(ingredientId)` (→ garde-manger), `commitPurchasesToPantry()` |
| `slices/pantry.ts` | `pantry: PantryItem[]`, `upsertPantryItem`, `removePantryItem`, `purgeExpired(today)` |
| `slices/settings.ts` | `settings: AppSettings`, `setSetting`, `completeOnboarding`, `resetAll` |
| `selectors.ts` | sélecteurs purs (références brutes uniquement) |
| `hooks.ts` | `useHydrated`, `useToday` (état `today` rafraîchi au focus de l'app, seule source d'horloge), `useShoppingList`, `useDayNutrition`, `useWeekNutrition`, `useSwapSuggestions`, `useCookWithPantry`, `usePantryAlerts`, `useWeekReport`, `useRecipeStatus` — tous en `useMemo` sur des références immuables |

Persisté (`partialize`) : `profile`, `currentPlan`, `seed`, `checked`, `packChoices`, `manualItems`, `pantry`, `settings`. **Jamais** la liste de courses ni `previousPlan`. Toute logique reste dans le core : une action = lecture de l'état + appel d'une fonction pure + `set` d'objets neufs.

Tests (`src/store/__tests__/`, AsyncStorage mocké dans `jest.setup.ts`) : actions principales, `partialize` n'écrit pas la liste, `migrate` v0→v1 et plan obsolète → `null`.

---

## 6. Design system et composants

- **Tokens** : étendre `src/constants/theme.ts` (existant) avec la palette de `proposition-ux.md` § 5.1 (`bg`, `surface`, `surfaceAlt`, `primary` vert `#2F6B3A`/`#7FBF8A`, `primarySoft`, `accent` orange `#E8843A`/`#F2A063`, `accentSoft`, `text`, `textMuted`, `border`, `success`, `warning`, `danger`, macros), `Spacing` (4·8·12·16·24·32), `Radius` (12 cartes, 20 chips, 28 sheets), `Typography` (police **système**, `fontVariant: ['tabular-nums']` pour quantités et prix). Hook `useTheme()` dans `src/hooks/use-theme.ts` (existant, à faire évoluer : suit `settings.themeMode`).
- **Refonte visuelle (demande du propriétaire, 2026-09-20)** sur le modèle « Food Delivery App UI/UX » fourni : fond gris très clair `#F4F5F7`, cartes blanches rayon 22 à ombre douce (`Shadow.card`, bordure fine en sombre), accent **jaune `#FFC529`** (boutons pleins « → Libellé », bouton central rond de la barre d'onglets, cases cochées, stepper), texte anthracite `#2B2B2E` (sur jaune aussi : le blanc du modèle n'est pas lisible), accent secondaire orange `#FF6B4A`, titres gras (police système arrondie `ui-rounded`), barre d'onglets blanche à coins arrondis rendue par `ui/tab-bar.tsx` (bouton « + » = feuille d'actions transverses). **Images PNG des produits et des plats** : Fluent Emoji 3D (Microsoft, MIT) dans `assets/images/food/` (65 fichiers, 160 px ingrédients / 256 px plats, 1,5 Mo), table `src/data/food-images.ts` générée par `scripts/food-images.py`, composant `ui/food-image.tsx` (pastille arrondie), test d'intégrité « chaque ingrédient et chaque recette ont une image ». Utilisées : carte repas, en-tête Semaine (dîner du jour), lignes de courses / garde-manger / Où acheter / swap, fiche recette (grand plat détouré + ingrédients), fiche article, accueil de l'onboarding et tuiles d'aversions.
- **Composants** (`src/components/`, un composant par fichier, props typées) : `ui/` Screen, Card, Text, Button (primary/secondary/ghost), Chip, Checkbox, Stepper, SegmentedControl, SectionHeader, EmptyState, Snackbar, StatTile, FoodImage, TabBar ; `plan/` WeekStrip, MealCard, SwapCandidateCard, MacroBar ; `shopping/` AisleSection, ShoppingRow, LeftoverNotice ; `pantry/` PantryRow, IngredientPicker ; `profile/` OptionCards, AllergenChips. Détail des props : `proposition-ux.md` § 5.3 (référence), adapté sans `ProgressRing`, `BottomSheet`, `Timer`.
- **Accessibilité** : cibles ≥ 44 pt, `accessibilityLabel` sur cases et boutons d'icône, contraste ≥ 4,5:1, haptique légère (`expo-haptics`) à la coche et au « cuisiné » (désactivable).
- **Dépendances** : **aucune nouvelle en v1**. Candidats v1.1 avec justification dans AVANCEMENT.md : `expo-keep-awake` (mode magasin), `react-native-svg` (anneau).
- Tests : `src/components/__tests__/` — `ShoppingRow`, `Stepper`, `Chip` (rendu + interaction avec `@testing-library/react-native`), pas de snapshot d'écran.

---

## 7. Organisation du travail et intégration

### 7.1 Mode économe (CLAUDE.md § 0.1)

L'agent principal écrit spec, core, store, composants, écrans, **un module + ses tests + un commit à la fois**. Seules les **données** (§ 3) sont déléguées : 2-3 agents Sonnet, chacun propriétaire d'un ou deux fichiers `recipes-*.ts` (l'agent principal écrit `aisles.ts`, `ingredients.ts` et `dataset.test.ts` **avant**, et publie la liste des ids). Un agent qui manque un ingrédient l'ajoute dans `src/data/ingredients-extra-<groupe>.ts` (fusionné par l'agent principal), jamais dans `ingredients.ts`.

### 7.2 Ordre

1. ~~types, rng, date, units, packaging, labels, params, dataset, filter~~ (fait)
2. `nutrition` → `planner` → `shopping` → `plan-edit` + `swap` → `leftovers` → `report` (chacun avec tests, fixtures communes)
3. `aisles`, `ingredients`, `dataset.test.ts` ; puis recettes (agents Sonnet) ; test d'intégrité vert
4. store (+ `jest.setup.ts`, bloc `jest` de `package.json` : `setupFilesAfterEnv`, vérifier que l'alias `@/` est résolu par `jest-expo`, sinon `moduleNameMapper`)
5. thème + composants `ui/` → composants métier → écrans (Semaine/Jour/Recette/Swap, puis Courses/Article/Magasin, puis Garde-manger/Ajout/Cuisiner-avec, puis Onboarding/Profil/Bilan)
6. intégration : `_layout.tsx`, `(tabs)/_layout.tsx`, `npx expo install --fix`, `typecheck`, `jest`, `expo-doctor`, `expo export`, Expo Go

### 7.3 Checklist d'intégration

`npm run typecheck` 0 erreur · `npm test` 100 % · `npx expo-doctor` 21/21 · `npx expo export` (android + ios) OK · Expo Go : onboarding → génération → swap → liste recalculée → cocher → « J'en ai déjà » → garde-manger → cuisiné → régénérer avec verrous → bilan · persistance après redémarrage · mode sombre · texte 130 %.

### 7.4 Scénarios à réfuter (revue finale, sous forme de tests ou d'essais manuels)

1 personne / 6 personnes (arrondis, packs) · végétalien + sans gluten + 15 min (créneaux `unfilled` affichés, pas de crash) · garde-manger périmé la veille du premier usage · swap du dîner source d'un batch · repas cuisiné puis régénération · changement de personnes après génération (`profileDrift` → bandeau) · semaine terminée · recette retirée du dataset (migration → plan `null`) · article manuel sans prix · double cochage rapide · changement de pack puis swap.

---

## 8. Journal des arbitrages

- **2026-09-19** — Rédaction initiale. Arbitrages du § 2 ; aucune nouvelle dépendance en v1 ; onboarding en un seul écran ; `cooked` et `unfilled` ajoutés au contrat ; régimes dérivés de `foodClass` ; clés `${planId}:${ingredientId}` pour l'état coché et le choix de pack ; `useToday` comme unique source d'horloge côté store.
- **2026-09-20** — Nutrition : les repas planifiés sont des assiettes (~1 300-1 500 kcal/jour pour 3 repas) alors que la cible journalière (2 000) inclut pain, fruits, laitages et boissons non planifiés → `NutritionTarget.plannedKcal / plannedProtein = PLANNED_SHARE (0,72) × cible` ; scores et pénalité du planificateur comparent à cette part. Bilan : économie et restes orphelins limités aux ingrédients ≤ 30 jours non staples (`REPORT_PERISHABLE_DAYS`). Test web : `InteractionManager` ne rappelle pas sur le web, `Alert` y est muet → `setTimeout` + `ActionSheet` maison.
- **2026-09-19** — Planificateur : sur le jeu synthétique, un batch augmente toujours le coût (+1,3 à +4,3 « € ») car le temps de cuisine n'est pas modélisé → ajout de `PlannerParams.batchBonus` (2) ; `PlanState.cooked` distingue « cuisiné » (jamais doublé) de « verrouillé ». Les petits-déjeuners/collations peuvent se répéter (pénalisés) si les candidats sont épuisés ; déjeuners/dîners restent uniques.
