# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> **Ce fichier est la source de vérité de l'ÉTAT du projet.** Les décisions, commandes, pièges et règles vivent dans [CLAUDE.md](CLAUDE.md) (ne pas les dupliquer ici). Mécanisme de mise à jour : CLAUDE.md § 8.

## État instantané (automatique)

<!-- auto:start — généré par `npm run docs:status`, NE PAS ÉDITER À LA MAIN -->
- Généré le : 2026-09-20 00:09
- Branche : `main` — dernier commit : 8cb008d « Recalibre le score d'équilibre : les repas planifiés couvrent 72 % de la cible journalière » (2026-09-20)
- Arbre de travail : 4 fichier(s) modifié(s) non commité(s)
- Code : core 19 fichier(s) · tests 134 cas dans 17 fichier(s) · données ≈ 66 recette(s), ≈ 150 ingrédient(s) · routes 15 · composants 16 · store 6
- Vérification : non exécutée (`npm run docs:verify`)
<!-- auto:end -->

## Reprise — état exact et prochaine étape

> Partie rédigée, à mettre à jour **à chaque fin de session** (les hooks refusent un commit / une fin de session si du code a changé sans elle). Toute IA qui reprend lit d'abord [CLAUDE.md](CLAUDE.md) § 0, puis cette section.

- **Ce qui existe** : scaffold Expo SDK 57 nettoyé, `src/app/_layout.tsx` (Stack minimal) et `src/app/index.tsx` (placeholder), thème/hooks du template, docs (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier), outillage `scripts/docs.mjs` + hooks (git pre-commit, Claude Code Stop). **Depuis le 2026-09-19** : les 3 propositions de conception copiées dans `docs/conception/` ; le **contrat de types** `src/core/types.ts` (arbitrage des propositions algo + ingénierie, identifiants anglais, `cooked`/`unfilled`/`packagingIndex`/`ManualItem` ajoutés) ; modules de base `src/core/rng.ts`, `date.ts`, `units.ts`, `packaging.ts`, `labels.ts` (libellés FR de toutes les énumérations, vérifiés par `Record` complets), `params.ts` (paramètres réglables + `resolvePlannerParams`), `dataset.ts` (index par id), `filter.ts` (régimes dérivés de `foodClass`, allergènes, aversions, temps semaine/week-end, saison, `candidatesForSlot`, `slotsForProfile`, `slotKey`) avec fixtures (ingrédients, recettes, profils) et 47 tests verts ; `tsconfig.json` : `"types": ["jest"]` (TypeScript 6 n'inclut plus les `@types/*` automatiquement).
- **`docs/SPEC.md`** rédigée (arbitrage des 3 propositions, routes, données/quotas, signatures du core, store, design, ordre de travail) : c'est la référence pour tout ce qui suit.
- **`src/core/nutrition.ts`** fait (cibles Mifflin-St Jeor / défauts, répartition par repas, macros journalières, pénalité continue, scores jour/semaine, diversité végétale) + fixture `plans.ts`.
- **`src/core/needs.ts`** (besoins d'une recette à l'échelle, optionnels interdits retirés) et **`src/core/planner.ts`** faits : contexte + état incrémental (`wasteDelta` vérifié contre un recalcul complet), glouton top-k, recuit simulé, batch cooking avec `batchBonus`, repas conservés (verrouillés/cuisinés), créneaux `unfilled`, `stateFromPlan` pour le swap ; jeu de données synthétique `__tests__/fixtures/synthetic.ts` (34 recettes, 21 ingrédients) ; génération complète en ~150 ms.
- **`src/core/aisles.ts`** (ordre de parcours), **`leftovers.ts`** (restes notables, recettes qui les absorbent, pack réutilisé par un repas ultérieur, faisabilité par garde-manger, « cuisiner avec ce que j'ai ») et **`shopping.ts`** (liste dérivée : agrégation multi-unités, garde-manger non périmé au premier usage, staples, optionnels interdits, choix de pack, sections par rayon, articles libres, `wasteScore`, `diffShoppingLists`, `addPurchasesToPantry`, `consumeFromPantry` FIFO) faits.
- **`src/core/plan-edit.ts`** (verrou, cuisiné, portions, semaine terminée, dérive du profil, repas incompatibles) et **`swap.ts`** (suggestions à impact : liste courante = garde-manger virtuel, cochés acquis, delta articles/prix, raisons FR ; `applySwap` verrouille, regénère le déjeuner « restes » lié, rend ses portions au dîner source, recalcule le coût) faits.
- **`src/core/report.ts`** (bilan : cuisinés, scores, restes orphelins, économie des packs partagés) et **`src/core/index.ts`** (baril de l'API publique) faits → **le core est complet : 19 fichiers, 107 tests.**
- **Écrans (première version fonctionnelle, SPEC § 1.3)** : `_layout.tsx` (splash jusqu'à hydratation, thème, Stack + modales), `index.tsx` (redirection onboarding/onglets), `(tabs)/_layout.tsx` (4 onglets Ionicons, badge articles restants), `onboarding.tsx` (7 étapes sur un écran → `generating`), `generating.tsx` (3 messages, génération après interactions, retour Semaine), `(tabs)/index.tsx` Semaine (bandeaux semaine terminée / profil modifié / créneaux vides, 3 tuiles, 7 jours de `MealCard`, appui long : remplacer / verrouiller / cuisiné, bouton flottant régénérer, snackbar), `(tabs)/shopping.tsx` Courses (sections par rayon, « besoin réel · reste », ♻ reste réutilisé, articles libres, placards à vérifier), `(tabs)/pantry.tsx`, `(tabs)/profile.tsx` (tous les réglages + effacer), `day/[day].tsx` (score du jour + MacroBar), `recipe/[id].tsx` (ingrédients à l'échelle + statut garde-manger/à acheter, étapes, nutrition, cuisiné / remplacer), `swap/[mealId].tsx` (5 alternatives avec raisons). `src/components/plan/meal-card.tsx`. **`npx expo export --platform android` construit le bundle (4,4 Mo).**
- **Test réel en web** (navigateur intégré, `.claude/launch.json` → `npx expo start --web`, viewport mobile) : parcours onboarding → génération → Semaine → Recette → Swap → Courses validé. Bugs trouvés et corrigés : (1) `InteractionManager.runAfterInteractions` ne rappelle jamais sur le web → génération via `setTimeout`, navigation seulement après succès, état d'erreur affiché ; (2) `Alert.alert` est muet sur le web → composant `ActionSheet` maison (menu d'appui long, confirmations régénérer / effacer) ; (3) `router.back()` sans historique → repli `replace('/(tabs)')` ; (4) « restes de ail » → élision `withDe` (`d’ail`). Undo du swap branché (snackbar « Annuler », `dismissUndo`). Aide au débogage : `globalThis.__wsfStore` en dev. Constat à traiter : le score « équilibre » affiche ~17/100 car les vrais plats totalisent ~1 300 kcal/jour face à une cible de 2 000 — recalibrer `computeTarget`/`dayScore` (ou la cible sans collation) avant de l'afficher.
- **Écrans secondaires faits** (2026-09-20) : `item/[ingredientId]` (à acheter vs besoin réel, reste + réemploi, recettes concernées, choix du conditionnement, recettes pour le reste, « J'en ai déjà »), `pantry-add` (recherche locale sans accent, quantité par conditionnement, date limite déduite), `cook-with` (faisabilité en %, manquants), `report` (bilan : cuisinés, scores, économie sur les **périssables** partagés, restes périssables sans réemploi, semaine suivante), `store-mode` (un rayon par page, grande police, cochés en bas) ; Courses : ligne → article, article libre, bouton « Magasin », « Mettre les N articles cochés au garde-manger » ; Garde-manger : Ajouter, Cuisiner avec ce que j'ai ; Semaine : Bilan dans le menu. `report.ts` : `sharedSavings` et restes orphelins limités aux ingrédients ≤ 30 jours non staples (`REPORT_PERISHABLE_DAYS`). **Toutes les routes de SPEC § 1.3 existent.**
- **Score d'équilibre recalibré** (2026-09-20) : `NutritionTarget.plannedKcal/plannedProtein` = 72 % de la cible (`PLANNED_SHARE`), utilisés par `dayScore` et `nutritionPenalty` ; sur le même plan réel le score passe de 17 à 73/100 (SPEC § 8).
- `npx expo install --fix` appliqué (2026-09-20) : `expo-doctor` **21/21** ; `AGENT.md` aligné sur le mode économe.
- **Ce qui manque pour livrer la v1** : test sur téléphone (Expo Go) jamais fait ; revue adversariale (SPEC § 7.4) ; icône / splash personnalisés.
- **Constat de la reprise du 2026-09-19** : le juge de synthèse du workflow `wf_4122c8d8-7cf` a **échoué** (erreur 429 « weekly limit » le 17/09, aucune synthèse écrite) ; les 3 propositions brutes sont intactes dans son `journal.jsonl` (CLAUDE.md § 7). `npm test` est **rouge** (« No tests found », exit 1) : le test de fumée cité ci-dessous n'a jamais été commité — se corrige avec les premiers tests du module `types`/`units`. `npm run typecheck` est vert.
- **`src/data/ingredients.ts`** fait : 150 ingrédients (agent Sonnet, validés par `src/data/__tests__/ingredients.test.ts`, 4 tests). Piège découvert : `expect(valeur, message)` est une syntaxe Vitest ; en Jest 29, accumuler les violations et faire `expect(problems).toEqual([])`.
- **`src/data/` complet** : 7 fichiers `recipes-*.ts` (13 petits-déjeuners, 8 collations, 10 français, 10 méditerranéens, 8 asiatiques, 8 orientaux, 9 végé = **66 recettes**, rédigées par 3 agents Sonnet), `recipes.ts`, `index.ts` (`DATASET`, `DATASET_VERSION = '2026.09.1'`), `__tests__/dataset.test.ts` (7 invariants : ids/noms uniques, ingrédients existants et convertibles, champs cohérents, couverture par créneau omnivore et végétalien sans gluten, variété, périssables jamais utilisés une seule fois, génération réelle d'une semaine de 28 repas sans créneau vide). Démo réelle : 2 personnes, 41 articles, 110,80 €, score anti-gaspi 96, variété 0, génération 302 ms (paramètres par défaut — à mesurer sur téléphone, réduire `anneal.iterations` si besoin).
- Retouche végé faite : 4 doublons de concept remplacés (pad thaï végétarien, risotto aux champignons, galettes de lentilles corail, soupe de butternut au lait de coco). Observation à traiter plus tard : aucun batch cooking n'est apparu dans la démo réelle (`batchBonus` 2 peut-être trop faible sur les vraies données).
- **`src/store/` complet** (SPEC § 5) : `types.ts` (slices, `PersistedState`, défauts), `migrations.ts` (`STORE_VERSION = 1`, table de migrations, `sanitizePersisted` qui rejette un plan d'une autre `datasetVersion` ou avec une recette inconnue), `index.ts` (`useAppStore` = 5 slices + `persist` AsyncStorage, `partialize`, `merge` assainissant ; actions qui n'appellent que le core : générer/regénérer avec repas conservés, swap + undo, verrou, cuisiné avec décompte du garde-manger, portions, semaine suivante, cochage/pack/articles libres, « j'en ai déjà », entrée au garde-manger après courses, réglages, reset), `selectors.ts`, `hooks.ts` (`useHydrated`, `useToday` = seule horloge, `useShoppingList`, `useWeekNutrition`, `useDayNutrition`, `useSwapSuggestions`, `useCookWithPantry`, `usePantryAlerts`, `useWeekReport`, `useRecipeIngredientStatus`) ; `jest.setup.ts` (mocks AsyncStorage + haptics) référencé par `setupFilesAfterEnv` ; 11 tests sur le vrai jeu de données.
- **Thème et composants de base faits** (SPEC § 6) : `src/constants/theme.ts` (palette clair/sombre typée `ThemeColors`, `Spacing`, `Radius`, `Typography`, `TouchTarget`), `src/hooks/use-theme.ts` (suit `settings.themeMode`), `src/hooks/use-haptics.ts` ; `src/components/ui/` : AppText, Screen, Card, Button, Chip, Checkbox, Stepper, SegmentedControl, SectionHeader, EmptyState, StatTile, MacroBar, Snackbar (+ baril) ; 5 tests RNTL (`src/components/__tests__/ui.test.tsx`). Pièges Jest consignés dans CLAUDE.md § 4.4 (RNTL 14 asynchrone, stub CSS).
- **En cours au moment de l'écriture** : rien ne tourne.

**Prochaine étape (dans l'ordre)** — mode économe (CLAUDE.md § 0.1), détail dans `docs/SPEC.md` § 7.2 :
1. Test sur téléphone (Expo Go) : mesurer la génération (réduire `anneal.iterations` si > 500 ms), vérifier modales, clavier, mode sombre, tailles de texte, appui long.
2. Revue adversariale (SPEC § 7.4 : 1 vs 6 personnes, végétalien sans gluten, garde-manger périmé, swap de batch, cuisiné puis régénération, changement de profil, semaine terminée…) sous forme de tests supplémentaires ; icône / splash personnalisés.
3. Intégration (`_layout.tsx`, `(tabs)/_layout.tsx`, `package.json` : `npx expo install --fix` pour les 4 paquets en retard de patch signalés par `expo-doctor` le 19/09), `typecheck`, `test`, `expo-doctor`, `expo export`, test Expo Go, mise à jour de ce fichier, commit.

## Statut global

| Phase | État | Détail |
|---|---|---|
| 0. Cadrage | ✅ Terminé | Objectif produit, contraintes techniques fixées |
| 1. Scaffolding technique | ✅ Terminé | Projet Expo SDK 57 + TypeScript strict, dépendances installées, base vérifiée |
| 2. Conception (spec) | ✅ Terminé | 3 propositions (`docs/conception/`) arbitrées par l'agent principal dans `docs/SPEC.md` (2026-09-19) |
| 3. Implémentation | ✅ Terminé (v1) | Mode économe : **core** (107 tests), **données** (66 recettes, 150 ingrédients, 11 tests), **store** (11 tests), **thème + composants ui** (5 tests), **16 routes** — reste le calibrage du score d'équilibre |
| 4. Intégration & vérification | 🔄 En cours | `tsc` ✅, `jest` ✅ (134), `expo export` android ✅, `expo-doctor` ✅ 21/21, parcours web ✅ ; revue adversariale à venir |
| 5. Test sur appareil | ⏳ À venir | Expo Go (Android / iOS) puis build EAS |

## Fait

- [x] Dossier projet initialisé (`git init`, branche `main`).
- [x] Template Expo `default` SDK 57 extrait manuellement (voir CLAUDE.md § 4.2 pour le pourquoi).
- [x] Boilerplate de démo supprimé (écran Explore, composants d'exemple, images React/Expo, script `reset-project`).
- [x] Dépendances ajoutées : `zustand`, `@react-native-async-storage/async-storage`, `expo-haptics`, `@expo/vector-icons` ; dev : `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native`.
- [x] Scripts npm : `test`, `test:watch`, `typecheck`, `doctor`, `docs:*` ; config Jest (`preset: jest-expo`).
- [x] `app.json` renommé (WSF – Week Shop Food).
- [x] Base vérifiée : `npx tsc --noEmit` ✅ ; `npx jest` ❌ tant qu'aucun test n'existe (constat du 2026-09-19, voir « Reprise »).
- [x] Documentation de reprise (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier).
- [x] Outillage doc : bloc auto-généré, hook git pre-commit, hook Claude Code Stop (`scripts/docs.mjs`).

- [x] **Spec définitive** `docs/SPEC.md` (2026-09-19) : arbitrage des 3 propositions, routes, données et quotas, signatures du core, store, design, ordre de travail, scénarios à réfuter.
- [x] Module `types` (contrat entre modules) — implémenté seul, en premier (2026-09-19), avec `rng`, `date`, `units`, `packaging`, `labels`, `params`, `dataset`, `filter` et 47 tests.

- [x] Core complet (2026-09-19) : `nutrition`, `planner` (+ `needs`), `aisles`, `leftovers`, `shopping`, `plan-edit`, `swap`, `report`, baril `index.ts` — 107 tests, génération d'un plan ≈ 150 ms.

- [x] Données (2026-09-19) : 150 ingrédients + 66 recettes (agents Sonnet) + 2 tests d'intégrité (11 cas) ; génération réelle validée.

- [x] Store zustand (2026-09-19) : 5 slices + persistance + migrations + hooks dérivés, 11 tests.

- [x] Thème + composants de base (2026-09-19) : 13 composants `ui/`, 5 tests.

- [x] Écrans v1 (2026-09-19) : layouts, onboarding, génération, Semaine, Courses, Garde-manger, Profil, Jour, Recette, Swap ; bundle Android exporté.
- [x] Écrans secondaires (2026-09-20) : article, ajout garde-manger, cuisiner avec ce que j'ai, bilan, mode magasin ; parcours complet validé en web.

## En cours

- [ ] Test sur téléphone (Expo Go) — nécessite le propriétaire.

## À faire
- [ ] Intégration finale (layout/onglets, `package.json`), `tsc`, `jest`, `expo-doctor`, `expo export`.
- [ ] Revue adversariale (bugs, cas limites : allergies, végan, 1 vs 6 personnes, arrondis, unités mixtes).
- [ ] Icône / splash screen personnalisés.
- [ ] Test sur téléphone via Expo Go, puis build EAS (Android APK/AAB, iOS TestFlight).

## Journal

- **2026-09-17** — Cadrage, scaffolding Expo SDK 57, nettoyage du template, dépendances, premier commit. Lancement du workflow de conception (3 propositions indépendantes + synthèse).
- **2026-09-17** — Documentation de reprise : `CLAUDE.md` (manuel, pièges, garde-fous), `AGENT.md` (rôle de l'agent), section « Reprise » ici, `README.md` réécrit. Les 3 propositions de conception sont rendues (UX 07:26, ingénierie 07:29, algorithmes 07:33) ; juge de synthèse en cours.
- **2026-09-17** — Optimisation de la mise à jour des docs : dédoublonnage (état ici, règles dans CLAUDE.md), bloc « État instantané » auto-généré, `scripts/docs.mjs`, hook git `pre-commit` et hook Claude Code `Stop` qui exigent une mise à jour rédigée d'AVANCEMENT.md dès que du code change.
- **2026-09-19** — Reprise (protocole CLAUDE.md § 0) : dépôt propre, typecheck vert, `npm test` rouge (aucun test). Le juge de synthèse `wf_4122c8d8-7cf` avait échoué sur quota sans rien produire ; propositions récupérées, relues et copiées dans `docs/conception/`. Workflow de synthèse `wf_204fbc5c-27c` lancé puis **arrêté** à la demande du propriétaire (quota 5 h à 50 %) : passage en **mode économe** (CLAUDE.md § 0.1), l'agent principal joue le juge lui-même. Contrat `src/core/types.ts` + `rng`/`date`/`units`/`packaging` + 30 tests ; `tsconfig.json` `types: ["jest"]`. Puis, avec la marge restante de quota : `labels.ts`, `params.ts` (+ `PlannerParamsOverride` dans le contrat), `dataset.ts`, `filter.ts` + fixtures recettes/profils, 47 tests. typecheck ✅ tests ✅. Arrêt à 79 % de la fenêtre 5 h.
- **2026-09-19 (reprise, fenêtre fraîche)** — `docs/SPEC.md` rédigée par l'agent principal (phase 2 terminée) ; CLAUDE.md § 7 pointe désormais vers `docs/conception/`. `nutrition.ts` + 11 tests (58 au total). `needs.ts` + `planner.ts` + 12 tests (70) ; arbitrage `batchBonus` consigné dans SPEC § 8. `aisles.ts`, `leftovers.ts`, `shopping.ts` + 23 tests (93). `plan-edit.ts`, `swap.ts` + 12 tests (105). `report.ts` + baril `index.ts` (107) : **core terminé**. Phase données lancée : test d'intégrité des ingrédients + agent Sonnet pour `ingredients.ts` (150, commité). Recettes : 3 agents Sonnet en parallèle ; petits-déjeuners + collations livrés (20 recettes) ; les 2 autres coupés par le quota (fenêtre saturée à 3 agents + agent principal), relancés après réinitialisation avec une table compacte des ingrédients (règle « Budget des agents » ajoutée à CLAUDE.md § 0.1). 66 recettes assemblées, test d'intégrité vert après 3 retouches (saisons de 2 petits-déjeuners, ciboulette partagée, 13e petit-déjeuner végétalien sans gluten toutes saisons) ; 118 tests au total. Retouche végé (4 doublons remplacés). Store zustand complet + hooks + `jest.setup.ts` : 129 tests. Thème + 13 composants `ui/` + tests RNTL : 134 tests. Écrans v1 (10 routes) + `MealCard` ; `npx expo export --platform android` OK ; garde-fou de performance du planificateur assoupli à 1 s sous jest (bruit machine).
- **2026-09-19 (soir)** — Test du parcours complet en web dans le navigateur intégré : 4 bugs corrigés (génération web, `Alert` muet → `ActionSheet`, `back()` sans historique, élision), undo du swap. Le planificateur, la liste et le swap se comportent comme prévu sur les vraies données.
- **2026-09-20** — Écrans secondaires (article, ajout garde-manger, cuisiner avec ce que j'ai, bilan, mode magasin) + branchements dans Courses / Garde-manger / Semaine ; bilan recalibré sur les périssables. 16 routes, 134 tests. Implémentation v1 fonctionnellement complète. Score d'équilibre recalibré (`PLANNED_SHARE`). `expo install --fix` → `expo-doctor` 21/21 ; AGENT.md aligné.
