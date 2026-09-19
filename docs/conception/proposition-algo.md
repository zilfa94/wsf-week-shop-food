# WSF – Week Shop Food : proposition algorithmique (src/core)

Tout ce qui suit est conçu comme un ensemble de **fonctions pures** (entrées → sorties, aucun accès au store, à l'horloge ou au réseau). Les seuls "effets" (temps, aléa) sont injectés : `seed: number` et, optionnellement, `maxIterations`. Le store zustand ne fait qu'appeler ces fonctions et persister leurs résultats.

Arborescence cible :

```
src/core/
  types.ts            # §1
  units.ts            # conversions, arrondi conditionnement (§3)
  rng.ts              # PRNG déterministe (mulberry32)
  filter.ts           # éligibilité recettes (§2.1)
  nutrition.ts        # besoins, macros, scores (§6)
  planner/
    state.ts          # PlanState incrémental (§2.3)
    cost.ts           # fonction de coût (§2.2)
    greedy.ts         # construction gloutonne (§2.4)
    anneal.ts         # recuit simulé borné (§2.5)
    generate.ts       # orchestration generateWeekPlan
  shopping.ts         # agrégation liste de courses (§3)
  swap.ts             # remplacement d'un repas (§4)
  leftovers.ts        # suggestions de restes (§5)
src/data/
  ingredients.ts      # base canonique
  recipes/*.ts        # ≥ 60 recettes
  aisles.ts           # ordre de parcours magasin
```

---

## 1. Modèle de données (types TS)

```ts
// ---------- Unités ----------
export type CanonicalUnit = 'g' | 'ml' | 'piece';
export type Unit =
  | CanonicalUnit
  | 'tbsp' | 'tsp'          // c. à s., c. à c.
  | 'bunch' | 'slice' | 'clove' | 'pinch' | 'cup' | 'can' | 'sachet' | 'handful';

export type Aisle =
  | 'fruits_legumes' | 'boucherie' | 'poissonnerie' | 'cremerie' | 'boulangerie'
  | 'epicerie_salee' | 'epicerie_sucree' | 'condiments' | 'surgeles' | 'boissons' | 'autre';

export type IngredientTag =
  | 'meat' | 'pork' | 'poultry' | 'fish' | 'shellfish' | 'egg' | 'dairy' | 'honey'
  | 'gluten' | 'lactose' | 'nuts' | 'peanut' | 'soy' | 'sesame' | 'mustard' | 'celery';

export interface Packaging {
  kind: 'pack' | 'bulk';   // pack = paquet indivisible ; bulk = vrac (pesé)
  size: number;            // taille du pack en unité canonique (pack) ou pas d'arrondi (bulk, ex. 50 g)
  price: number;           // € par pack (pack) ou € par `size` (bulk)
  label?: string;          // "paquet 500 g", "boîte de 6", "botte"
}

export interface Ingredient {
  id: string;                          // 'poulet_blanc'
  name: string;                        // 'Blanc de poulet'
  aisle: Aisle;
  canonicalUnit: CanonicalUnit;
  /** 1 <unit> = conversions[unit] <canonicalUnit>. Ex. tomate: { piece: 120 } ; huile: { tbsp: 15, tsp: 5 } */
  conversions: Partial<Record<Unit, number>>;
  packaging: Packaging;
  shelfLifeDays: number;               // durée de vie après achat/ouverture
  freezable: boolean;
  staple: boolean;                     // sel, poivre, huile… supposés présents
  tags: IngredientTag[];
  leftoverUses?: string[];             // usages génériques : "à congeler en portions", "soupe", "omelette"
}

// ---------- Recettes ----------
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Cuisine = 'francaise' | 'mediterraneenne' | 'italienne' | 'asiatique' | 'orientale' | 'indienne' | 'mexicaine' | 'nordique' | 'autre';
export type ProteinKind = 'poultry' | 'beef' | 'pork' | 'lamb' | 'fish' | 'shellfish' | 'egg' | 'legume' | 'tofu' | 'dairy' | 'none';
export type CarbKind = 'pasta' | 'rice' | 'potato' | 'bread' | 'quinoa' | 'bulgur' | 'legume' | 'none';
export type Season = 'printemps' | 'ete' | 'automne' | 'hiver';

export interface Macros { kcal: number; protein: number; carbs: number; fat: number; fiber: number; }

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  optional?: boolean;      // exclu de la liste si profile.skipOptional
}

export interface Recipe {
  id: string;
  name: string;
  mealTypes: MealType[];
  cuisine: Cuisine;
  servings: number;                 // portions produites par la recette telle qu'écrite
  ingredients: RecipeIngredient[];
  prepMin: number;
  cookMin: number;
  nutritionPerServing: Macros;
  mainProtein: ProteinKind;
  baseCarb: CarbKind;
  seasons: Season[];                // [] = toute l'année
  tags: string[];                   // 'rapide', 'batch', 'sans-cuisson', 'plat-unique'…
  batchable: boolean;               // peut être doublé pour un déjeuner du lendemain
  steps: string[];
}

// ---------- Profil ----------
export type Diet = 'omnivore' | 'vegetarien' | 'vegetalien' | 'sans_porc' | 'pescetarien';
export type Allergen = 'gluten' | 'lactose' | 'nuts' | 'peanut' | 'egg' | 'soy' | 'sesame' | 'shellfish' | 'fish' | 'mustard' | 'celery';
export type Goal = 'equilibre' | 'perte_poids' | 'prise_masse' | 'budget';
export type Activity = 'sedentaire' | 'leger' | 'modere' | 'intense';

export interface BodyInfo { sex: 'f' | 'm'; age: number; heightCm: number; weightKg: number; activity: Activity; }

export interface UserProfile {
  persons: number;                  // 1..8
  diet: Diet;
  allergies: Allergen[];
  dislikedIngredientIds: string[];
  goal: Goal;
  maxCookMinWeekday: number;        // prep + cook
  maxCookMinWeekend: number;
  includeSnack: boolean;
  includeBreakfast: boolean;
  allowBatchCooking: boolean;
  assumeStaples: boolean;           // ne pas lister sel/huile/poivre
  body?: BodyInfo;
}

// ---------- Plan ----------
export interface MealSlot { day: number; type: MealType; }          // day 0 = lundi
export interface Meal {
  slot: MealSlot;
  recipeId: string;
  servings: number;                 // portions cuisinées (= persons, ou 2×persons si batch)
  locked: boolean;                  // ne pas toucher lors d'une régénération
  leftoverOf?: MealSlot;            // ce repas = restes du repas cuisiné à ce slot (batch)
}
export interface WeekPlan {
  id: string;
  weekStartISO: string;             // 'YYYY-MM-DD' (lundi)
  seed: number;
  datasetVersion: string;
  meals: Meal[];                    // ≤ 28 entrées
  cost: CostBreakdown;              // pour affichage/debug
}
export interface CostBreakdown { total: number; waste: number; variety: number; nutrition: number; budget: number; }

// ---------- Courses / garde-manger ----------
export interface PantryItem {
  ingredientId: string;
  quantity: number;                 // en unité canonique
  expiresISO?: string;
}
export interface ShoppingItem {
  ingredientId: string;
  aisle: Aisle;
  needed: number;                   // besoin brut (canonique)
  fromPantry: number;
  toBuyExact: number;               // needed - fromPantry
  packs: number;                    // nb de packs (pack) ou quantité arrondie / size (bulk)
  bought: number;                   // quantité réellement achetée (canonique)
  leftover: number;                 // bought - toBuyExact
  leftoverValue: number;            // € "à risque"
  price: number;
  label: string;                    // "2 × paquet 500 g"
  usedIn: { recipeId: string; slot: MealSlot; quantity: number }[];
  firstUseDay: number;
  checked: boolean;
}
export interface ShoppingList {
  items: ShoppingItem[];
  sections: { aisle: Aisle; items: ShoppingItem[] }[];   // ordre de parcours
  totalPrice: number;
  totalLeftoverValue: number;
  staplesToCheck: string[];                              // ingredientIds staple utilisés
}
```

---

## 2. Génération du plan 7 jours

### 2.1 Filtrage (hard constraints) — `filter.ts`

```ts
const DIET_FORBIDDEN: Record<Diet, IngredientTag[]> = {
  omnivore: [],
  sans_porc: ['pork'],
  pescetarien: ['meat', 'pork', 'poultry'],
  vegetarien: ['meat', 'pork', 'poultry', 'fish', 'shellfish'],
  vegetalien: ['meat', 'pork', 'poultry', 'fish', 'shellfish', 'egg', 'dairy', 'honey'],
};
const ALLERGEN_TAG: Record<Allergen, IngredientTag> = {
  gluten: 'gluten', lactose: 'lactose', nuts: 'nuts', peanut: 'peanut', egg: 'egg',
  soy: 'soy', sesame: 'sesame', shellfish: 'shellfish', fish: 'fish', mustard: 'mustard', celery: 'celery',
};

export function isRecipeEligible(r: Recipe, profile: UserProfile, ingredients: Map<string, Ingredient>): boolean {
  const forbidden = new Set<IngredientTag>([
    ...DIET_FORBIDDEN[profile.diet],
    ...profile.allergies.map(a => ALLERGEN_TAG[a]),
  ]);
  for (const ri of r.ingredients) {
    if (ri.optional) continue;                 // un ingrédient optionnel peut être retiré
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) return false;                    // dataset invalide → test unitaire le garantit
    if (profile.dislikedIngredientIds.includes(ing.id)) return false;
    if (ing.tags.some(t => forbidden.has(t))) return false;
  }
  return true;
}

export function fitsTime(r: Recipe, slot: MealSlot, profile: UserProfile): boolean {
  const max = slot.day >= 5 ? profile.maxCookMinWeekend : profile.maxCookMinWeekday;
  return r.prepMin + r.cookMin <= max;
}

/** Candidats par slot, calculés une fois. */
export function buildCandidates(recipes: Recipe[], profile: UserProfile, ingredients: Map<string, Ingredient>, season: Season, slots: MealSlot[]): Map<string /*slotKey*/, string[]> {
  const eligible = recipes.filter(r => isRecipeEligible(r, profile, ingredients)
                                    && (r.seasons.length === 0 || r.seasons.includes(season)));
  const out = new Map<string, string[]>();
  for (const s of slots) {
    out.set(slotKey(s), eligible.filter(r => r.mealTypes.includes(s.type) && fitsTime(r, s, profile)).map(r => r.id));
  }
  return out;
}
```

Note : les allergènes "retirables" (ingrédient optionnel taggé) n'excluent pas la recette ; la liste de courses omettra l'ingrédient (flag `skipOptional` calculé automatiquement si conflit).

### 2.2 Fonction de coût — `planner/cost.ts`

```
cost(plan) = W_waste · waste(plan)
           + W_var   · variety(plan)
           + W_nut   · nutrition(plan)
           + W_bud   · budget(plan)          (W_bud = 0 sauf goal === 'budget')
```

Poids par défaut : `W_waste = 1` (en €), `W_var = 1.5`, `W_nut = 8`, `W_bud = 0.15` (budget serré) — tout est ramené à une "échelle euro".

**a) Gaspillage** (le cœur du produit). Pour chaque ingrédient `i` avec besoin agrégé `need_i` (déjà mis à l'échelle nb de personnes) et stock garde-manger `pantry_i` :

```ts
export function perishFactor(ing: Ingredient): number {
  if (ing.staple) return 0;
  if (ing.freezable) return 0.25;
  if (ing.shelfLifeDays <= 5) return 1.0;
  if (ing.shelfLifeDays <= 14) return 0.6;
  if (ing.shelfLifeDays <= 60) return 0.2;
  return 0.05;                              // pâtes, riz, conserves : quasi nul
}

export function ingredientCost(ing: Ingredient, need: number, pantry: number, wBudget: number): number {
  const toBuy = Math.max(0, need - pantry);
  if (toBuy <= EPS) return 0;
  const { packs, bought } = roundToPackaging(ing, toBuy);     // §3
  const price = packs * ing.packaging.price;
  const unitPrice = ing.packaging.price / ing.packaging.size;
  const leftover = bought - toBuy;
  return leftover * unitPrice * perishFactor(ing) + wBudget * price;
}
// waste(plan) = Σ_i ingredientCost(i, need_i, pantry_i, wBudget)
```

Pourquoi ce coût et non "(acheté − utilisé) × prix" brut : un reste de riz ne coûte rien (il se garde), un reste de crème fraîche ou de coriandre vaut sa valeur pleine. Le facteur reflète la **probabilité de perte réelle**.

**b) Variété** (soft, en plus de la contrainte dure "jamais 2× la même recette") :

```ts
export function varietyPenalty(plan: MealMatrix, recipes: Map<string, Recipe>): number {
  let p = 0;
  for (const type of ['lunch', 'dinner'] as const) {
    for (let d = 1; d < 7; d++) {
      const a = recipes.get(plan[type][d - 1]), b = recipes.get(plan[type][d]);
      if (!a || !b) continue;
      if (a.mainProtein === b.mainProtein && a.mainProtein !== 'none') p += 1.0;  // même protéine 2 jours de suite
      if (a.baseCarb === b.baseCarb && a.baseCarb !== 'none') p += 0.6;
      if (a.cuisine === b.cuisine) p += 0.4;
    }
  }
  // même jour : déjeuner et dîner avec même protéine ou même féculent
  for (let d = 0; d < 7; d++) {
    const a = recipes.get(plan.lunch[d]), b = recipes.get(plan.dinner[d]);
    if (a && b && a.mainProtein === b.mainProtein && a.mainProtein !== 'none') p += 0.8;
  }
  // fréquence hebdo : > 3 fois la même protéine ou > 4 fois la même cuisine sur déj+dîner
  const prot = countBy(allLunchDinner(plan), r => r.mainProtein);
  for (const [k, n] of prot) if (k !== 'none' && n > 3) p += (n - 3) * 1.2;
  const cui = countBy(allLunchDinner(plan), r => r.cuisine);
  for (const [, n] of cui) if (n > 4) p += (n - 4) * 0.8;
  // petits-déjeuners : max 3 fois le même
  return p;
}
```

**c) Nutrition** : pénalité quadratique hors bande de tolérance ±10 % (détail §6) :

```ts
export function nutritionPenalty(daily: Macros[], target: NutritionTarget): number {
  let p = 0;
  for (const d of daily) {
    p += bandDev(d.kcal, target.kcal, 0.10) ** 2;
    p += 0.5 * bandDev(d.protein, target.protein, 0.15) ** 2;
    p += 0.2 * Math.max(0, (20 - d.fiber) / 20) ** 2;         // fibres < 20 g/j pénalisées
  }
  return p;                                                     // ordre de grandeur 0..7
}
const bandDev = (v: number, t: number, tol: number) => Math.max(0, Math.abs(v - t) / t - tol);
```

**d) Budget** : `Σ packs × prix` (uniquement objectif "budget serré", sinon déjà partiellement capturé via le gaspillage).

### 2.3 État incrémental — `planner/state.ts`

Le recuit doit évaluer des milliers de mouvements ; il faut un delta en **O(k)** (k ≈ 8–15 ingrédients par recette), pas un recalcul de toute la liste.

```ts
export interface PlanContext {
  recipes: Map<string, Recipe>;
  ingredients: Map<string, Ingredient>;
  profile: UserProfile;
  pantry: Map<string, number>;                 // qty canonique disponible (déjà filtrée par péremption)
  target: NutritionTarget;                     // §6
  /** Besoins canoniques d'une recette POUR `persons` personnes, précalculés */
  needsOf: Map<string, Map<string, number>>;   // recipeId -> ingredientId -> qty
  macrosOf: Map<string, Macros>;               // par personne (= per serving)
  candidates: Map<string, string[]>;           // slotKey -> recipeIds
  weights: { waste: number; variety: number; nutrition: number; budget: number };
}

export interface PlanState {
  assign: Map<string, string | null>;          // slotKey -> recipeId
  used: Set<string>;                           // recettes déjà placées (contrainte dure)
  needs: Map<string, number>;                  // ingredientId -> besoin agrégé
  ingCost: Map<string, number>;                // cache ingredientCost par ingrédient
  waste: number;                               // Σ ingCost
}

/** Retourne la variation de `waste` si on ajoute (sign=+1) ou retire (sign=-1) une recette. Ne modifie rien. */
export function wasteDelta(st: PlanState, ctx: PlanContext, recipeId: string, sign: 1 | -1): number {
  let delta = 0;
  for (const [ingId, q] of ctx.needsOf.get(recipeId)!) {
    const ing = ctx.ingredients.get(ingId)!;
    const before = st.needs.get(ingId) ?? 0;
    const after = Math.max(0, before + sign * q);
    delta += ingredientCost(ing, after, ctx.pantry.get(ingId) ?? 0, ctx.weights.budget)
           - (st.ingCost.get(ingId) ?? 0);
  }
  return delta;
}

/** Applique pour de bon (mutation locale sur une copie de travail — la fonction exportée `generateWeekPlan` reste pure vis-à-vis de l'extérieur). */
export function applyAssign(st: PlanState, ctx: PlanContext, key: string, recipeId: string | null): void {
  const prev = st.assign.get(key) ?? null;
  if (prev) { updateNeeds(st, ctx, prev, -1); st.used.delete(prev); }
  if (recipeId) { updateNeeds(st, ctx, recipeId, +1); st.used.add(recipeId); }
  st.assign.set(key, recipeId);
}
function updateNeeds(st: PlanState, ctx: PlanContext, recipeId: string, sign: 1 | -1) {
  for (const [ingId, q] of ctx.needsOf.get(recipeId)!) {
    const ing = ctx.ingredients.get(ingId)!;
    const after = Math.max(0, (st.needs.get(ingId) ?? 0) + sign * q);
    const c = ingredientCost(ing, after, ctx.pantry.get(ingId) ?? 0, ctx.weights.budget);
    st.waste += c - (st.ingCost.get(ingId) ?? 0);
    st.needs.set(ingId, after); st.ingCost.set(ingId, c);
  }
}

export function totalCost(st: PlanState, ctx: PlanContext): CostBreakdown {
  const matrix = toMatrix(st.assign);
  const variety = varietyPenalty(matrix, ctx.recipes);
  const nutrition = nutritionPenalty(dailyMacros(matrix, ctx.macrosOf), ctx.target);
  const w = ctx.weights;
  return { waste: st.waste, variety, nutrition, budget: 0,
           total: w.waste * st.waste + w.variety * variety + w.nutrition * nutrition };
}
```

`variety` et `nutrition` se recalculent intégralement (≤ 28 slots, quelques dizaines d'opérations) : inutile de les rendre incrémentaux.

### 2.4 Construction gloutonne — `planner/greedy.ts`

Ordre des slots : **dîners** (les plus contraints en variété et ingrédients), puis déjeuners, puis petits-déjeuners, puis collations. Pour chaque slot, on évalue tous les candidats par delta de coût et on choisit parmi les `k = 3` meilleurs avec le PRNG (donne des plans différents pour des seeds différents sans dégrader la qualité).

```ts
export function greedyBuild(st: PlanState, ctx: PlanContext, rng: () => number, order: MealSlot[]): void {
  for (const slot of order) {
    const key = slotKey(slot);
    if (st.assign.get(key)) continue;                        // slot verrouillé déjà rempli
    const scored: { id: string; c: number }[] = [];
    for (const id of ctx.candidates.get(key) ?? []) {
      if (st.used.has(id)) continue;
      const dW = wasteDelta(st, ctx, id, +1);
      st.assign.set(key, id);                                 // essai "à blanc" pour variété/nutrition
      const v = varietyPenalty(toMatrix(st.assign), ctx.recipes);
      const n = nutritionPenalty(dailyMacros(toMatrix(st.assign), ctx.macrosOf), ctx.target);
      st.assign.set(key, null);
      scored.push({ id, c: ctx.weights.waste * dW + ctx.weights.variety * v + ctx.weights.nutrition * n });
    }
    if (scored.length === 0) { st.assign.set(key, null); continue; }   // slot vide → signalé à l'UI
    scored.sort((a, b) => a.c - b.c);
    const pick = scored[Math.floor(rng() * Math.min(3, scored.length))]!;
    applyAssign(st, ctx, key, pick.id);
  }
}
```

Complexité : 28 slots × 60 candidats × (k + 40) ≈ 100 000 opérations élémentaires → < 20 ms.

### 2.5 Recuit simulé borné — `planner/anneal.ts`

```ts
export interface AnnealParams { iterations: number; t0: number; tEnd: number; }
export const DEFAULT_ANNEAL: AnnealParams = { iterations: 4000, t0: 2.0, tEnd: 0.02 };

export function anneal(st: PlanState, ctx: PlanContext, rng: () => number, p: AnnealParams): PlanState {
  const keys = [...st.assign.keys()].filter(k => !isLocked(k, ctx));
  let cur = totalCost(st, ctx).total;
  let best = cloneState(st), bestCost = cur;
  const alpha = Math.pow(p.tEnd / p.t0, 1 / p.iterations);
  let T = p.t0;

  for (let it = 0; it < p.iterations; it++, T *= alpha) {
    const move = rng() < 0.7 ? 'replace' : 'swap';
    let undo: () => void;

    if (move === 'replace') {
      const key = keys[Math.floor(rng() * keys.length)]!;
      const cands = (ctx.candidates.get(key) ?? []).filter(id => !st.used.has(id));
      if (cands.length === 0) continue;
      const prev = st.assign.get(key) ?? null;
      const next = cands[Math.floor(rng() * cands.length)]!;
      applyAssign(st, ctx, key, next);
      undo = () => applyAssign(st, ctx, key, prev);
    } else {
      // échange de deux slots de même type (ne change pas waste ; agit sur variété/nutrition)
      const [k1, k2] = pickTwoSameType(keys, rng);
      const a = st.assign.get(k1) ?? null, b = st.assign.get(k2) ?? null;
      if (!a || !b || !ctx.candidates.get(k1)!.includes(b) || !ctx.candidates.get(k2)!.includes(a)) continue;
      st.assign.set(k1, b); st.assign.set(k2, a);            // pas de variation de needs
      undo = () => { st.assign.set(k1, a); st.assign.set(k2, b); };
    }

    const nxt = totalCost(st, ctx).total;
    const d = nxt - cur;
    if (d <= 0 || rng() < Math.exp(-d / T)) {
      cur = nxt;
      if (cur < bestCost - 1e-9) { bestCost = cur; best = cloneState(st); }
    } else {
      undo();
    }
  }
  return best;
}
```

### 2.6 Orchestration — `planner/generate.ts`

```ts
export interface GenerateInput {
  recipes: Recipe[]; ingredients: Ingredient[]; profile: UserProfile; pantry: PantryItem[];
  weekStartISO: string; seed: number; locked?: Meal[]; anneal?: Partial<AnnealParams>; datasetVersion: string;
}

export function generateWeekPlan(input: GenerateInput): WeekPlan {
  const rng = mulberry32(input.seed);
  const slots = buildSlots(input.profile);                   // 7 × (breakfast? + lunch + dinner + snack?)
  const ctx = buildContext(input, slots);                    // needsOf / macrosOf / candidates / target
  const st = emptyState(slots);
  for (const m of input.locked ?? []) applyAssign(st, ctx, slotKey(m.slot), m.recipeId);
  greedyBuild(st, ctx, rng, orderSlots(slots));              // dîners → déjeuners → pdj → collations
  const best = anneal(st, ctx, rng, { ...DEFAULT_ANNEAL, ...input.anneal });
  const withBatch = input.profile.allowBatchCooking ? applyBatchCooking(best, ctx, rng) : best;
  return toWeekPlan(withBatch, ctx, input);
}
```

**Batch cooking (optionnel, post-traitement)** : pour chaque dîner `batchable` de jour `d` dont le déjeuner `d+1` a un coût de gaspillage marginal > 0 et une variété non violée, remplacer le déjeuner `d+1` par `{ recipeId: dîner, servings: 0, leftoverOf: dîner }` et passer `dîner.servings = 2 × persons`. Accepter si le coût total baisse. Limité à 2 par semaine.

### 2.7 Pourquoi glouton + recuit (et pas autre chose)

- Espace de recherche : ~60 candidats par slot, 21–28 slots → ~60^21 combinaisons ; contraintes non linéaires (arrondi au pack : fonction en escalier, non convexe). Un PLNE exact demanderait un solveur (glpk.js, ~1 Mo, lent sur mobile) et la modélisation de `ceil()` par variables entières ; hors de proportion pour un problème dont la solution "assez bonne" suffit.
- Le glouton seul tombe dans des optima locaux (choisit tôt une recette qui bloque la réutilisation des ingrédients des slots suivants) ; le recuit corrige ces choix avec un coût de mouvement O(k).
- Budget calcul : 4000 itérations × ~200 opérations ≈ 800 k opérations → 50–150 ms sur un téléphone milieu de gamme, sur le thread JS, sans bloquer l'UI de façon perceptible (on peut aussi le passer en `InteractionManager.runAfterInteractions`).
- Déterminisme : `mulberry32(seed)` + nombre d'itérations fixe (pas de `Date.now()`) ⇒ même (profil, garde-manger, dataset, seed) → même plan. "Régénérer" = `seed + 1`. Reproductible dans les tests jest.
- Anytime : si on veut une borne en temps stricte, on injecte `deadline?: () => boolean` ; documenté comme non déterministe.

```ts
// rng.ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 3. Agrégation de la liste de courses — `units.ts`, `shopping.ts`

### 3.1 Conversion d'unités

```ts
const DEFAULT_LIQUID: Partial<Record<Unit, number>> = { tbsp: 15, tsp: 5, cup: 250 };   // valables uniquement si canonicalUnit === 'ml'
export const EPS = 1e-6;

export function toCanonical(ing: Ingredient, quantity: number, unit: Unit): number {
  if (unit === ing.canonicalUnit) return quantity;
  const f = ing.conversions[unit] ?? (ing.canonicalUnit === 'ml' ? DEFAULT_LIQUID[unit] : undefined);
  if (f === undefined) throw new Error(`Conversion manquante: ${ing.id} ${unit}`);   // un test parcourt tout le dataset
  return quantity * f;
}
```

Exemples de `conversions` dans la base : `farine: { tbsp: 8, tsp: 3, cup: 125 }`, `tomate: { piece: 120 }`, `ail: { clove: 5, piece: 40 }`, `persil: { bunch: 30, tbsp: 4 }`, `pain_mie: { slice: 25 }`, `oeuf` (canonique `piece`) : `{}`, `tomates_pelees: { can: 400 }`.

### 3.2 Arrondi au conditionnement

```ts
export function roundToPackaging(ing: Ingredient, toBuy: number): { packs: number; bought: number } {
  const { kind, size } = ing.packaging;
  if (toBuy <= EPS) return { packs: 0, bought: 0 };
  const packs = Math.ceil(toBuy / size - EPS);       // EPS évite 500.0000001 g → 2 paquets
  return { packs, bought: packs * size };
  // kind === 'bulk' : size est le pas (ex. 50 g) et price le prix de ce pas → même formule
}
```

`piece` : `size: 6` pour les œufs → 5 œufs ⇒ 1 boîte de 6, reste 1. Poulet en vrac : `size: 100, price: 1.2` → 380 g ⇒ 400 g.

### 3.3 Construction de la liste

```ts
export const AISLE_ORDER: Aisle[] = ['fruits_legumes', 'boulangerie', 'boucherie', 'poissonnerie', 'cremerie',
  'epicerie_salee', 'condiments', 'epicerie_sucree', 'boissons', 'surgeles', 'autre'];

export function buildShoppingList(
  plan: WeekPlan, recipes: Map<string, Recipe>, ingredients: Map<string, Ingredient>,
  profile: UserProfile, pantry: PantryItem[], previous?: ShoppingList /* pour conserver les cases cochées */
): ShoppingList {
  // 1) agrégation des besoins
  const acc = new Map<string, { needed: number; usedIn: ShoppingItem['usedIn']; firstUseDay: number }>();
  for (const m of plan.meals) {
    if (m.servings === 0) continue;                                   // restes de batch : rien à acheter
    const r = recipes.get(m.recipeId)!;
    const scale = m.servings / r.servings;                            // ex. 4 pers / recette pour 2 = ×2
    for (const ri of r.ingredients) {
      const ing = ingredients.get(ri.ingredientId)!;
      if (ri.optional && isForbiddenFor(ing, profile)) continue;      // optionnel retiré (allergie/aversion)
      const q = toCanonical(ing, ri.quantity, ri.unit) * scale;
      const e = acc.get(ing.id) ?? { needed: 0, usedIn: [], firstUseDay: 7 };
      e.needed += q; e.usedIn.push({ recipeId: r.id, slot: m.slot, quantity: q });
      e.firstUseDay = Math.min(e.firstUseDay, m.slot.day);
      acc.set(ing.id, e);
    }
  }
  // 2) garde-manger, arrondi, prix
  const items: ShoppingItem[] = [];
  const staplesToCheck: string[] = [];
  for (const [ingId, e] of acc) {
    const ing = ingredients.get(ingId)!;
    if (ing.staple && profile.assumeStaples) { staplesToCheck.push(ingId); continue; }
    const usable = pantryAvailable(pantry, ingId, plan.weekStartISO, e.firstUseDay);
    const fromPantry = Math.min(usable, e.needed);
    const toBuyExact = Math.max(0, e.needed - fromPantry);
    const { packs, bought } = roundToPackaging(ing, toBuyExact);
    const unitPrice = ing.packaging.price / ing.packaging.size;
    const leftover = Math.max(0, bought - toBuyExact);
    items.push({
      ingredientId: ingId, aisle: ing.aisle, needed: e.needed, fromPantry, toBuyExact, packs, bought, leftover,
      leftoverValue: leftover * unitPrice * perishFactor(ing),
      price: packs * ing.packaging.price,
      label: formatPacks(ing, packs),                                  // "2 × paquet 500 g", "1 botte", "6 œufs"
      usedIn: e.usedIn, firstUseDay: e.firstUseDay,
      checked: previous?.items.find(p => p.ingredientId === ingId)?.checked ?? false,
    });
  }
  // 3) regroupement par rayon dans l'ordre de parcours
  const sections = AISLE_ORDER
    .map(aisle => ({ aisle, items: items.filter(i => i.aisle === aisle && i.packs > 0).sort(byName(ingredients)) }))
    .filter(s => s.items.length > 0);
  return {
    items, sections, staplesToCheck,
    totalPrice: round2(items.reduce((s, i) => s + i.price, 0)),
    totalLeftoverValue: round2(items.reduce((s, i) => s + i.leftoverValue, 0)),
  };
}

/** Quantité du garde-manger utilisable : non périmée à la date du premier usage. */
export function pantryAvailable(pantry: PantryItem[], ingId: string, weekStartISO: string, firstUseDay: number): number {
  const useDate = addDays(weekStartISO, firstUseDay);
  return pantry.filter(p => p.ingredientId === ingId && (!p.expiresISO || p.expiresISO >= useDate))
               .reduce((s, p) => s + p.quantity, 0);
}
```

Les items avec `packs === 0` mais `fromPantry > 0` sont affichés dans une section "Déjà chez vous" (l'utilisateur voit ce qu'il consomme du stock). Fonction annexe pure `pantryAfterWeek(pantry, list)` : retire `fromPantry` des stocks (FIFO par date de péremption) et ajoute les `leftover` avec `expiresISO = weekStart + shelfLifeDays` — c'est ce qui rend la semaine suivante "consciente" des restes.

---

## 4. Swap d'un repas — `swap.ts`

Principe : **la liste existante devient un "garde-manger virtuel"**. On retire le repas du slot, on calcule l'état des besoins sans lui, puis pour chaque candidat on mesure ce qu'il coûterait en *nouveaux packs* et en *gaspillage supplémentaire*. Les articles déjà cochés (achetés) comptent comme acquis : les remplacer par une recette qui ne les utilise pas serait du gaspillage pur.

```ts
export interface SwapSuggestion {
  recipeId: string;
  score: number;                 // plus bas = mieux
  newPurchaseCost: number;       // € de packs supplémentaires
  wasteDelta: number;
  reused: string[];              // ingredientIds déjà dans la liste
  newItems: string[];            // ingredientIds à acheter en plus
}

export function suggestSwaps(
  plan: WeekPlan, slot: MealSlot, ctx: PlanContext, list: ShoppingList, n = 5
): SwapSuggestion[] {
  const key = slotKey(slot);
  // 1) état sans le repas courant ; les articles cochés deviennent du "pantry" supplémentaire
  const ctx2 = { ...ctx, pantry: mergePantry(ctx.pantry, list.items.filter(i => i.checked).map(i => [i.ingredientId, i.bought])) };
  const st = stateFromPlan(plan, ctx2);
  const current = st.assign.get(key) ?? null;
  if (current) applyAssign(st, ctx2, key, null);
  const baseCost = totalCost(st, ctx2);
  const packsBefore = packsMap(st, ctx2);              // ingredientId -> packs à acheter, sans ce repas

  // 2) évaluer chaque candidat
  const out: SwapSuggestion[] = [];
  for (const id of ctx2.candidates.get(key) ?? []) {
    if (st.used.has(id) || id === current) continue;
    applyAssign(st, ctx2, key, id);
    const c = totalCost(st, ctx2);
    const packsAfter = packsMap(st, ctx2);
    let newPurchaseCost = 0; const reused: string[] = []; const newItems: string[] = [];
    for (const [ingId] of ctx2.needsOf.get(id)!) {
      const ing = ctx2.ingredients.get(ingId)!;
      const dPacks = (packsAfter.get(ingId) ?? 0) - (packsBefore.get(ingId) ?? 0);
      if (dPacks > 0) { newPurchaseCost += dPacks * ing.packaging.price; newItems.push(ingId); }
      else if (!ing.staple) reused.push(ingId);
    }
    out.push({
      recipeId: id, newPurchaseCost, reused, newItems,
      wasteDelta: c.waste - baseCost.waste,
      // le swap privilégie explicitement les nouveaux achats (1 €) puis le reste de la fonction de coût
      score: 1.0 * newPurchaseCost + (c.total - baseCost.total),
    });
    applyAssign(st, ctx2, key, null);
  }
  return out.sort((a, b) => a.score - b.score).slice(0, n);
}

export function applySwap(plan: WeekPlan, slot: MealSlot, recipeId: string, ctx: PlanContext): WeekPlan {
  const meals = plan.meals.map(m => sameSlot(m.slot, slot)
    ? { ...m, recipeId, servings: ctx.profile.persons, locked: true, leftoverOf: undefined } : m);
  // si le repas remplacé était la source d'un batch, le déjeuner "restes" redevient un slot à regénérer
  const fixed = meals.map(m => m.leftoverOf && sameSlot(m.leftoverOf, slot) ? regenerateSingleSlot(m, ctx) : m);
  const st = stateFromPlan({ ...plan, meals: fixed }, ctx);
  return { ...plan, meals: fixed, cost: totalCost(st, ctx) };
}
```

Puis le store appelle `buildShoppingList(newPlan, …, previousList)` : la liste se recalcule intégralement (rapide, O(total ingrédients)), les cases cochées sont conservées par `ingredientId`.

Le calcul est **O(candidats × k)** ≈ 60 × 12 → instantané ; l'UI peut afficher pour chaque suggestion : "Réutilise poulet, courgettes, crème · +1 article (feta, 1,80 €)".

---

## 5. Suggestions de restes — `leftovers.ts`

```ts
export interface LeftoverSuggestion {
  ingredientId: string;
  leftover: number; leftoverValue: number;
  recipes: { recipeId: string; coversValue: number; extraCost: number; score: number }[];
  genericUses: string[];                 // ing.leftoverUses
  freezeHint: boolean;                   // ing.freezable
}

const LEFTOVER_MIN_VALUE = 0.30;         // €
const LEFTOVER_MIN_RATIO = 0.20;         // 20 % du pack

export function suggestLeftoverUses(
  list: ShoppingList, plan: WeekPlan, ctx: PlanContext, maxRecipesPerItem = 3
): LeftoverSuggestion[] {
  const leftovers = new Map<string, number>();                     // reste prévisible par ingrédient
  for (const i of list.items) {
    const ing = ctx.ingredients.get(i.ingredientId)!;
    if (i.leftover <= EPS || ing.staple) continue;
    if (i.leftoverValue < LEFTOVER_MIN_VALUE && i.leftover / ing.packaging.size < LEFTOVER_MIN_RATIO) continue;
    leftovers.set(i.ingredientId, i.leftover);
  }
  const inPlan = new Set(plan.meals.map(m => m.recipeId));
  const out: LeftoverSuggestion[] = [];

  for (const [ingId, qty] of leftovers) {
    const ing = ctx.ingredients.get(ingId)!;
    const cands: LeftoverSuggestion['recipes'] = [];
    for (const r of ctx.recipes.values()) {
      if (inPlan.has(r.id) || !isRecipeEligible(r, ctx.profile, ctx.ingredients)) continue;
      const needs = ctx.needsOf.get(r.id)!;
      if (!needs.has(ingId)) continue;
      let coversValue = 0, extraCost = 0;
      for (const [nId, nQty] of needs) {
        const nIng = ctx.ingredients.get(nId)!;
        const have = (leftovers.get(nId) ?? 0) + (ctx.pantry.get(nId) ?? 0);
        const used = Math.min(have, nQty);
        coversValue += used * (nIng.packaging.price / nIng.packaging.size) * perishFactor(nIng);
        if (!nIng.staple && nQty - used > EPS) extraCost += roundToPackaging(nIng, nQty - used).packs * nIng.packaging.price;
      }
      // favorise les recettes qui absorbent le reste ET n'imposent pas de nouvelles courses
      cands.push({ recipeId: r.id, coversValue, extraCost, score: coversValue - 0.5 * extraCost });
    }
    cands.sort((a, b) => b.score - a.score);
    out.push({
      ingredientId: ingId, leftover: qty, leftoverValue: list.items.find(i => i.ingredientId === ingId)!.leftoverValue,
      recipes: cands.slice(0, maxRecipesPerItem),
      genericUses: ing.leftoverUses ?? [],
      freezeHint: ing.freezable,
    });
  }
  // les restes les plus "chers" en premier ; les périssables avant les longue-conservation
  return out.sort((a, b) => b.leftoverValue - a.leftoverValue);
}
```

Actions proposées par l'UI à partir de ces résultats (toutes déjà couvertes par des fonctions pures) : "Ajouter cette recette en collation/dimanche" (→ `applySwap` sur un slot vide ou de faible coût), "Marquer à congeler" (→ `pantryAfterWeek` avec `expiresISO` étendue), "Reporter sur la semaine prochaine" (→ garde-manger).

---

## 6. Nutrition — `nutrition.ts`

```ts
export interface NutritionTarget { kcal: number; protein: number; carbs: number; fat: number; perMeal: Record<MealType, number>; }

const ACTIVITY: Record<Activity, number> = { sedentaire: 1.2, leger: 1.375, modere: 1.55, intense: 1.725 };
const GOAL_FACTOR: Record<Goal, number> = { equilibre: 1.0, perte_poids: 0.85, prise_masse: 1.10, budget: 1.0 };
const DEFAULT_KCAL: Record<Goal, number> = { equilibre: 2000, perte_poids: 1700, prise_masse: 2400, budget: 2000 };
const MACRO_SPLIT: Record<Goal, { p: number; c: number; f: number }> = {
  equilibre:   { p: 0.20, c: 0.50, f: 0.30 },
  perte_poids: { p: 0.30, c: 0.40, f: 0.30 },
  prise_masse: { p: 0.25, c: 0.50, f: 0.25 },
  budget:      { p: 0.20, c: 0.55, f: 0.25 },
};

export function bmrMifflinStJeor(b: BodyInfo): number {
  const base = 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age;
  return b.sex === 'm' ? base + 5 : base - 161;
}

export function computeTarget(profile: UserProfile): NutritionTarget {
  let kcal = profile.body
    ? bmrMifflinStJeor(profile.body) * ACTIVITY[profile.body.activity] * GOAL_FACTOR[profile.goal]
    : DEFAULT_KCAL[profile.goal];
  const floor = profile.body?.sex === 'f' ? 1200 : 1500;               // garde-fou perte de poids
  kcal = Math.max(floor, Math.round(kcal / 10) * 10);
  const s = MACRO_SPLIT[profile.goal];
  const shares = profile.includeSnack
    ? { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 }
    : { breakfast: 0.25, lunch: 0.40, dinner: 0.35, snack: 0 };
  if (!profile.includeBreakfast) { /* redistribuer : lunch 0.5 / dinner 0.4 / snack 0.1 */ }
  return {
    kcal,
    protein: Math.round(kcal * s.p / 4), carbs: Math.round(kcal * s.c / 4), fat: Math.round(kcal * s.f / 9),
    perMeal: mapValues(shares, v => Math.round(kcal * v)),
  };
}

/** Macros par jour et par personne (les macros des recettes sont "per serving" = par personne). */
export function dailyMacros(matrix: MealMatrix, macrosOf: Map<string, Macros>): Macros[] {
  return range(7).map(d => sumMacros(
    (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => matrix[t][d]).filter(Boolean).map(id => macrosOf.get(id!)!)
  ));
}

/** Score 0..100 d'une journée. */
export function dayScore(m: Macros, t: NutritionTarget): number {
  const kcalDev = Math.abs(m.kcal - t.kcal) / t.kcal;                  // 0 = parfait
  const protDev = Math.max(0, (t.protein - m.protein) / t.protein);    // seul le déficit pénalise
  const fatRatio = (m.fat * 9) / Math.max(1, m.kcal);
  const fatDev = Math.max(0, fatRatio - 0.40);                         // > 40 % kcal en lipides pénalisé
  const fiberDev = Math.max(0, (25 - m.fiber) / 25);
  const penalty = 60 * Math.min(1, kcalDev / 0.3) + 20 * Math.min(1, protDev / 0.3) + 10 * Math.min(1, fatDev / 0.2) + 10 * fiberDev;
  return Math.round(Math.max(0, 100 - penalty));
}

/** Score hebdo : moyenne des jours + bonus diversité (nb d'ingrédients distincts du rayon fruits & légumes ≥ 10). */
export function weekBalanceScore(plan: WeekPlan, ctx: PlanContext): { score: number; days: number[]; avg: Macros } {
  const days = dailyMacros(toMatrix(assignOf(plan)), ctx.macrosOf).map(m => dayScore(m, ctx.target));
  const distinctVeg = new Set(plan.meals.flatMap(m => [...ctx.needsOf.get(m.recipeId)!.keys()])
                        .filter(id => ctx.ingredients.get(id)!.aisle === 'fruits_legumes')).size;
  const bonus = Math.min(5, Math.max(0, distinctVeg - 8));
  return { score: Math.min(100, Math.round(mean(days) + bonus)), days, avg: meanMacros(days) };
}
```

Le planificateur (§2.2) utilise `nutritionPenalty` (continue, dérivable "à la main") ; l'UI affiche `weekBalanceScore` (lisible). Les deux partagent `computeTarget`.

Précision assumée : macros "approximatives par portion" dans le dataset ⇒ bande de tolérance ±10 % pour ne pas sur-optimiser un bruit.

---

## 7. Tests unitaires (jest-expo) — `src/core/__tests__/`

### `dataset.test.ts` (invariants du jeu de données — évite 90 % des bugs)
- Chaque `RecipeIngredient.ingredientId` existe dans la base.
- Chaque `(ingredient, unit)` utilisé dans une recette est convertible via `toCanonical` (ne lève pas).
- ≥ 60 recettes ; chaque `MealType` a ≥ 10 recettes éligibles pour un profil omnivore et ≥ 7 pour végétalien + sans gluten (sinon le planificateur produirait des slots vides).
- `packaging.size > 0`, `price > 0`, `shelfLifeDays > 0`, `servings ≥ 1`, macros > 0.
- Pas d'ingrédient taggé `meat`/`pork`/… dans une recette taggée `vegan` (cohérence).

### `units.test.ts`
- `toCanonical(huile, 2, 'tbsp') === 30` ; `toCanonical(farine, 1, 'cup') === 125` ; unité inconnue → throw.
- `roundToPackaging` : 380 g pâtes (pack 500) → 1 pack, bought 500, leftover 120 ; 500.0000001 g → 1 pack (EPS) ; 5 œufs (pack 6) → 1 ; 7 œufs → 2 ; 0 → 0 packs ; vrac poulet pas 100 g : 380 → 400.

### `filter.test.ts`
- Végétalien exclut recette avec `dairy`, `egg`, `honey` ; végétarien accepte `egg`/`dairy` ; `sans_porc` exclut `pork` mais accepte `poultry` ; pescetarien accepte `fish` exclut `poultry`.
- Allergie `nuts` : recette avec noix **optionnelle** reste éligible, et l'ingrédient est absent de la liste de courses.
- Aversion `dislikedIngredientIds` exclut la recette.
- Temps : recette 50 min éligible le samedi (max 90) mais pas le mardi (max 30).

### `planner.test.ts`
- Déterminisme : même input + même seed → plans strictement égaux (deep equal) ; seed différent → au moins un repas différent.
- Contrainte dure : aucune recette dupliquée dans un plan ; tous les slots remplis pour profil omnivore ; slots vides signalés (`null`) si candidats insuffisants au lieu de crasher.
- Variété : sur 20 seeds, jamais plus de 3 dîners consécutifs avec la même `mainProtein` ; la pénalité `varietyPenalty` d'un plan artificiel "7× poulet" > celle d'un plan alterné.
- Anti-gaspillage : dataset synthétique de 3 recettes dont 2 partagent une botte de coriandre ; le plan choisit les 2 recettes partageuses (coût waste plus bas) plutôt que la 3e.
- `wasteDelta` incrémental == différence de `waste` recalculé de zéro (propriété testée sur 200 mouvements aléatoires).
- Recuit : `totalCost(best) ≤ totalCost(greedy)` pour 10 seeds.
- Slot `locked` inchangé après génération.
- Batch cooking : le déjeuner "restes" a `servings === 0` et le dîner source `servings === 2 × persons`.
- Performance : génération complète < 300 ms en environnement jest (garde-fou de régression, seuil large).

### `shopping.test.ts`
- Mise à l'échelle : recette pour 2, 1 personne → ×0,5 ; 6 personnes → ×3 ; quantités canoniques exactes.
- Agrégation multi-unités : 2 c. à s. d'huile (recette A) + 30 ml (recette B) → 60 ml, 1 article.
- Arrondi : 1 personne, besoin 120 g pâtes → 1 pack 500 g, leftover 380 ; 6 personnes, 1 080 g → 3 packs, leftover 420.
- Garde-manger partiel : besoin 600 g riz, garde-manger 200 g → toBuyExact 400, 1 pack 1 kg, fromPantry 200.
- Garde-manger périmé : `expiresISO` < date de premier usage → non déduit ; valide → déduit. Deux entrées du même ingrédient additionnées.
- Staples : `assumeStaples` → sel absent de la liste, présent dans `staplesToCheck` ; `assumeStaples=false` → listé.
- Ingrédient optionnel interdit par allergie → absent de la liste ; optionnel autorisé → présent.
- `sections` suit `AISLE_ORDER`, aucune section vide, `packs === 0` exclus des sections mais présents dans `items`.
- `totalPrice` = Σ prix ; `totalLeftoverValue` cohérent avec `perishFactor` (pâtes ≈ 0, coriandre = valeur pleine).
- Conservation des `checked` via `previous`.
- `pantryAfterWeek` : consomme FIFO par péremption, ajoute les restes avec date `weekStart + shelfLifeDays`.

### `swap.test.ts`
- Le candidat n°1 renvoyé a le `newPurchaseCost` minimal parmi les candidats à égalité de coût total (dataset synthétique).
- Un article coché est traité comme acquis : une recette qui l'utilise est mieux classée qu'une recette équivalente qui ne l'utilise pas.
- `applySwap` verrouille le slot, ne duplique pas une recette déjà dans le plan, invalide le déjeuner "restes" lié.
- La liste recalculée après swap conserve les cases cochées.

### `leftovers.test.ts`
- Reste de 120 g de pâtes (valeur ≈ 0,05 €, ratio 24 %) → suggéré uniquement par le seuil ratio ; reste de 10 g de coriandre à 0,10 € et ratio 33 % → suggéré ; reste de 5 g de sel (staple) → jamais.
- Une recette qui consomme deux restes et n'exige aucun nouvel achat est classée avant une recette qui n'en consomme qu'un.
- Les recettes déjà dans le plan ne sont jamais proposées ; les recettes inéligibles (régime) non plus.
- `freezeHint` vrai pour ingrédient congelable.

### `nutrition.test.ts`
- Mifflin-St Jeor : homme 30 ans, 180 cm, 75 kg → BMR 1 730 ; femme 30 ans, 165 cm, 60 kg → BMR 1 320 (±1 arrondi).
- Facteurs activité/objectif appliqués ; plancher 1 200/1 500 respecté en perte de poids.
- Sans `body` : valeurs par défaut par objectif.
- Répartition par repas somme à `kcal` (±2 arrondi) avec et sans collation.
- `dayScore` : jour exactement à la cible → 100 ; kcal +30 % → ≤ 40 ; déficit protéines seul → 100 − ~20.
- `weekBalanceScore` borné [0, 100] ; bonus diversité plafonné à 5.
- `nutritionPenalty` = 0 pour un plan dans la bande ±10 %, > 0 en dehors.

### `rng.test.ts`
- `mulberry32(42)` produit une séquence figée (snapshot des 5 premières valeurs) ; valeurs dans [0, 1).

---

### Récapitulatif des paramètres réglables (fichier `src/core/params.ts`)

| Paramètre | Défaut | Rôle |
|---|---|---|
| `W_waste / W_var / W_nut / W_bud` | 1 / 1.5 / 8 / 0.15 | pondération du coût |
| `anneal.iterations / t0 / tEnd` | 4000 / 2.0 / 0.02 | budget calcul & exploration |
| `greedyTopK` | 3 | diversité entre seeds |
| `perishFactor` paliers | 5 / 14 / 60 jours | gravité d'un reste |
| `nutrition tolerance` | ±10 % kcal, ±15 % protéines | bande sans pénalité |
| `LEFTOVER_MIN_VALUE / RATIO` | 0,30 € / 20 % | seuil de suggestion de restes |
| `maxBatchPerWeek` | 2 | plats doublés |

Tout est pur, sérialisable et testable en isolation ; le store zustand ne contient que `profile`, `pantry`, `plan`, `shoppingList` et les seeds, persistés via AsyncStorage.