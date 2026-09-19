# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> **Ce fichier est la source de vérité de l'ÉTAT du projet.** Les décisions, commandes, pièges et règles vivent dans [CLAUDE.md](CLAUDE.md) (ne pas les dupliquer ici). Mécanisme de mise à jour : CLAUDE.md § 8.

## État instantané (automatique)

<!-- auto:start — généré par `npm run docs:status`, NE PAS ÉDITER À LA MAIN -->
- Généré le : 2026-09-19 19:16
- Branche : `main` — dernier commit : 0ee69a3 « Ajoute le référentiel de 150 ingrédients et son test d'intégrité » (2026-09-19)
- Arbre de travail : 13 fichier(s) modifié(s) non commité(s)
- Code : core 19 fichier(s) · tests 118 cas dans 15 fichier(s) · données ≈ 66 recette(s), ≈ 150 ingrédient(s) · routes 1 · composants 0 · store 0
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
- **Ce qui n'existe pas encore** : `src/data/`, `src/store/`, `src/components/` (hors template), écrans.
- **Constat de la reprise du 2026-09-19** : le juge de synthèse du workflow `wf_4122c8d8-7cf` a **échoué** (erreur 429 « weekly limit » le 17/09, aucune synthèse écrite) ; les 3 propositions brutes sont intactes dans son `journal.jsonl` (CLAUDE.md § 7). `npm test` est **rouge** (« No tests found », exit 1) : le test de fumée cité ci-dessous n'a jamais été commité — se corrige avec les premiers tests du module `types`/`units`. `npm run typecheck` est vert.
- **`src/data/ingredients.ts`** fait : 150 ingrédients (agent Sonnet, validés par `src/data/__tests__/ingredients.test.ts`, 4 tests). Piège découvert : `expect(valeur, message)` est une syntaxe Vitest ; en Jest 29, accumuler les violations et faire `expect(problems).toEqual([])`.
- **`src/data/` complet** : 7 fichiers `recipes-*.ts` (13 petits-déjeuners, 8 collations, 10 français, 10 méditerranéens, 8 asiatiques, 8 orientaux, 9 végé = **66 recettes**, rédigées par 3 agents Sonnet), `recipes.ts`, `index.ts` (`DATASET`, `DATASET_VERSION = '2026.09.1'`), `__tests__/dataset.test.ts` (7 invariants : ids/noms uniques, ingrédients existants et convertibles, champs cohérents, couverture par créneau omnivore et végétalien sans gluten, variété, périssables jamais utilisés une seule fois, génération réelle d'une semaine de 28 repas sans créneau vide). Démo réelle : 2 personnes, 41 articles, 110,80 €, score anti-gaspi 96, variété 0, génération 302 ms (paramètres par défaut — à mesurer sur téléphone, réduire `anneal.iterations` si besoin).
- **En cours au moment de l'écriture** : l'agent végé remplace 4 recettes en doublon de concept (2e shakshuka, 2e ratatouille, 2e gratin d'aubergine, curry de pois chiches ≈ chana masala) dans `recipes-veggie.ts` ; le test `src/data` doit rester vert. Observation à traiter plus tard : aucun batch cooking n'est apparu dans la démo réelle (`batchBonus` 2 peut-être trop faible sur les vraies données).

**Prochaine étape (dans l'ordre)** — mode économe (CLAUDE.md § 0.1), détail dans `docs/SPEC.md` § 7.2 :
1. Valider et commiter la retouche végé (4 recettes remplacées), `npx jest src/data` vert.
2. Store zustand + persistance + tests (SPEC § 5) — `jest.setup.ts` + `setupFilesAfterEnv` dans `package.json` (agent principal) ; thème + composants (SPEC § 6) ; écrans (SPEC § 1.3).
3. Intégration (`_layout.tsx`, `(tabs)/_layout.tsx`, `package.json` : `npx expo install --fix` pour les 4 paquets en retard de patch signalés par `expo-doctor` le 19/09), `typecheck`, `test`, `expo-doctor`, `expo export`, test Expo Go, mise à jour de ce fichier, commit.

## Statut global

| Phase | État | Détail |
|---|---|---|
| 0. Cadrage | ✅ Terminé | Objectif produit, contraintes techniques fixées |
| 1. Scaffolding technique | ✅ Terminé | Projet Expo SDK 57 + TypeScript strict, dépendances installées, base vérifiée |
| 2. Conception (spec) | ✅ Terminé | 3 propositions (`docs/conception/`) arbitrées par l'agent principal dans `docs/SPEC.md` (2026-09-19) |
| 3. Implémentation | 🔄 En cours | Mode économe : **core complet** (107 tests), **données complètes** (66 recettes, 150 ingrédients, 11 tests) ; store, composants, écrans à venir |
| 4. Intégration & vérification | ⏳ À venir | `tsc`, `jest`, `expo-doctor`, `expo export`, revue adversariale |
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

## En cours

- [ ] Retouche des 4 recettes végé en doublon (agent Sonnet), puis store.

## À faire
- [ ] Store zustand (profil, plan, courses cochées, garde-manger, réglages) + persistance.
- [ ] Thème + composants réutilisables (MealCard, IngredientRow, AisleSection, Chip…).
- [ ] Écrans : onboarding, semaine + détail recette, courses, garde-manger + réglages.
- [ ] Intégration finale (layout/onglets, `package.json`), `tsc`, `jest`, `expo-doctor`, `expo export`.
- [ ] Revue adversariale (bugs, cas limites : allergies, végan, 1 vs 6 personnes, arrondis, unités mixtes).
- [ ] Icône / splash screen personnalisés.
- [ ] Test sur téléphone via Expo Go, puis build EAS (Android APK/AAB, iOS TestFlight).

## Journal

- **2026-09-17** — Cadrage, scaffolding Expo SDK 57, nettoyage du template, dépendances, premier commit. Lancement du workflow de conception (3 propositions indépendantes + synthèse).
- **2026-09-17** — Documentation de reprise : `CLAUDE.md` (manuel, pièges, garde-fous), `AGENT.md` (rôle de l'agent), section « Reprise » ici, `README.md` réécrit. Les 3 propositions de conception sont rendues (UX 07:26, ingénierie 07:29, algorithmes 07:33) ; juge de synthèse en cours.
- **2026-09-17** — Optimisation de la mise à jour des docs : dédoublonnage (état ici, règles dans CLAUDE.md), bloc « État instantané » auto-généré, `scripts/docs.mjs`, hook git `pre-commit` et hook Claude Code `Stop` qui exigent une mise à jour rédigée d'AVANCEMENT.md dès que du code change.
- **2026-09-19** — Reprise (protocole CLAUDE.md § 0) : dépôt propre, typecheck vert, `npm test` rouge (aucun test). Le juge de synthèse `wf_4122c8d8-7cf` avait échoué sur quota sans rien produire ; propositions récupérées, relues et copiées dans `docs/conception/`. Workflow de synthèse `wf_204fbc5c-27c` lancé puis **arrêté** à la demande du propriétaire (quota 5 h à 50 %) : passage en **mode économe** (CLAUDE.md § 0.1), l'agent principal joue le juge lui-même. Contrat `src/core/types.ts` + `rng`/`date`/`units`/`packaging` + 30 tests ; `tsconfig.json` `types: ["jest"]`. Puis, avec la marge restante de quota : `labels.ts`, `params.ts` (+ `PlannerParamsOverride` dans le contrat), `dataset.ts`, `filter.ts` + fixtures recettes/profils, 47 tests. typecheck ✅ tests ✅. Arrêt à 79 % de la fenêtre 5 h.
- **2026-09-19 (reprise, fenêtre fraîche)** — `docs/SPEC.md` rédigée par l'agent principal (phase 2 terminée) ; CLAUDE.md § 7 pointe désormais vers `docs/conception/`. `nutrition.ts` + 11 tests (58 au total). `needs.ts` + `planner.ts` + 12 tests (70) ; arbitrage `batchBonus` consigné dans SPEC § 8. `aisles.ts`, `leftovers.ts`, `shopping.ts` + 23 tests (93). `plan-edit.ts`, `swap.ts` + 12 tests (105). `report.ts` + baril `index.ts` (107) : **core terminé**. Phase données lancée : test d'intégrité des ingrédients + agent Sonnet pour `ingredients.ts` (150, commité). Recettes : 3 agents Sonnet en parallèle ; petits-déjeuners + collations livrés (20 recettes) ; les 2 autres coupés par le quota (fenêtre saturée à 3 agents + agent principal), relancés après réinitialisation avec une table compacte des ingrédients (règle « Budget des agents » ajoutée à CLAUDE.md § 0.1). 66 recettes assemblées, test d'intégrité vert après 3 retouches (saisons de 2 petits-déjeuners, ciboulette partagée, 13e petit-déjeuner végétalien sans gluten toutes saisons) ; 118 tests au total.
