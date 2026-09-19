# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> **Ce fichier est la source de vérité de l'ÉTAT du projet.** Les décisions, commandes, pièges et règles vivent dans [CLAUDE.md](CLAUDE.md) (ne pas les dupliquer ici). Mécanisme de mise à jour : CLAUDE.md § 8.

## État instantané (automatique)

<!-- auto:start — généré par `npm run docs:status`, NE PAS ÉDITER À LA MAIN -->
- Généré le : 2026-09-19 14:06
- Branche : `main` — dernier commit : f27d53c « Ajoute nutrition au core : cibles, macros journalières, pénalité et scores » (2026-09-19)
- Arbre de travail : 10 fichier(s) modifié(s) non commité(s)
- Code : core 12 fichier(s) · tests 70 cas dans 8 fichier(s) · données ≈ 0 recette(s), ≈ 0 ingrédient(s) · routes 1 · composants 0 · store 0
- Vérification : non exécutée (`npm run docs:verify`)
<!-- auto:end -->

## Reprise — état exact et prochaine étape

> Partie rédigée, à mettre à jour **à chaque fin de session** (les hooks refusent un commit / une fin de session si du code a changé sans elle). Toute IA qui reprend lit d'abord [CLAUDE.md](CLAUDE.md) § 0, puis cette section.

- **Ce qui existe** : scaffold Expo SDK 57 nettoyé, `src/app/_layout.tsx` (Stack minimal) et `src/app/index.tsx` (placeholder), thème/hooks du template, docs (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier), outillage `scripts/docs.mjs` + hooks (git pre-commit, Claude Code Stop). **Depuis le 2026-09-19** : les 3 propositions de conception copiées dans `docs/conception/` ; le **contrat de types** `src/core/types.ts` (arbitrage des propositions algo + ingénierie, identifiants anglais, `cooked`/`unfilled`/`packagingIndex`/`ManualItem` ajoutés) ; modules de base `src/core/rng.ts`, `date.ts`, `units.ts`, `packaging.ts`, `labels.ts` (libellés FR de toutes les énumérations, vérifiés par `Record` complets), `params.ts` (paramètres réglables + `resolvePlannerParams`), `dataset.ts` (index par id), `filter.ts` (régimes dérivés de `foodClass`, allergènes, aversions, temps semaine/week-end, saison, `candidatesForSlot`, `slotsForProfile`, `slotKey`) avec fixtures (ingrédients, recettes, profils) et 47 tests verts ; `tsconfig.json` : `"types": ["jest"]` (TypeScript 6 n'inclut plus les `@types/*` automatiquement).
- **`docs/SPEC.md`** rédigée (arbitrage des 3 propositions, routes, données/quotas, signatures du core, store, design, ordre de travail) : c'est la référence pour tout ce qui suit.
- **`src/core/nutrition.ts`** fait (cibles Mifflin-St Jeor / défauts, répartition par repas, macros journalières, pénalité continue, scores jour/semaine, diversité végétale) + fixture `plans.ts`.
- **`src/core/needs.ts`** (besoins d'une recette à l'échelle, optionnels interdits retirés) et **`src/core/planner.ts`** faits : contexte + état incrémental (`wasteDelta` vérifié contre un recalcul complet), glouton top-k, recuit simulé, batch cooking avec `batchBonus`, repas conservés (verrouillés/cuisinés), créneaux `unfilled`, `stateFromPlan` pour le swap ; jeu de données synthétique `__tests__/fixtures/synthetic.ts` (34 recettes, 21 ingrédients) ; génération complète en ~150 ms.
- **Ce qui n'existe pas encore** : le reste de `src/core/` (shopping, plan-edit, swap, leftovers, report), `src/data/`, `src/store/`, `src/components/` (hors template), écrans.
- **Constat de la reprise du 2026-09-19** : le juge de synthèse du workflow `wf_4122c8d8-7cf` a **échoué** (erreur 429 « weekly limit » le 17/09, aucune synthèse écrite) ; les 3 propositions brutes sont intactes dans son `journal.jsonl` (CLAUDE.md § 7). `npm test` est **rouge** (« No tests found », exit 1) : le test de fumée cité ci-dessous n'a jamais été commité — se corrige avec les premiers tests du module `types`/`units`. `npm run typecheck` est vert.
- **En cours au moment de l'écriture** : rien ne tourne (session en cours, chaque module est commité dès qu'il est vert).

**Prochaine étape (dans l'ordre)** — mode économe (CLAUDE.md § 0.1), détail dans `docs/SPEC.md` § 7.2 :
1. Core, un module + ses tests + un commit à la fois, signatures de SPEC § 4 : `nutrition` → `planner` → `shopping` → `plan-edit` + `swap` → `leftovers` → `report` (source algorithmique : `docs/conception/proposition-algo.md` ; fixtures dans `src/core/__tests__/fixtures/`).
2. Données : `src/data/aisles.ts`, `ingredients.ts` (~150) et `src/data/__tests__/dataset.test.ts` par l'agent principal, PUIS les `recipes-*.ts` par 2-3 agents **Sonnet** (quotas SPEC § 3.3).
3. Store zustand + persistance + tests (SPEC § 5) ; thème + composants (SPEC § 6) ; écrans (SPEC § 1.3).
4. Intégration (`_layout.tsx`, `(tabs)/_layout.tsx`, `package.json` : `npx expo install --fix` pour les 4 paquets en retard de patch signalés par `expo-doctor` le 19/09), `typecheck`, `test`, `expo-doctor`, `expo export`, test Expo Go, mise à jour de ce fichier, commit.

## Statut global

| Phase | État | Détail |
|---|---|---|
| 0. Cadrage | ✅ Terminé | Objectif produit, contraintes techniques fixées |
| 1. Scaffolding technique | ✅ Terminé | Projet Expo SDK 57 + TypeScript strict, dépendances installées, base vérifiée |
| 2. Conception (spec) | ✅ Terminé | 3 propositions (`docs/conception/`) arbitrées par l'agent principal dans `docs/SPEC.md` (2026-09-19) |
| 3. Implémentation | 🔄 En cours | Mode économe : types + fondations du core faits ; nutrition/planner/shopping/swap/leftovers/report, données, store, écrans à venir |
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

## En cours

- [ ] Core « intelligent » : ~~`nutrition`~~ (11 tests) → ~~`planner`~~ (12 tests) → `shopping` → `plan-edit` + `swap` → `leftovers` → `report`.

## À faire
- [ ] Données : ingrédients canoniques + recettes (scindées par cuisine/slot pour paralléliser, agents Sonnet).
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
- **2026-09-19 (reprise, fenêtre fraîche)** — `docs/SPEC.md` rédigée par l'agent principal (phase 2 terminée) ; CLAUDE.md § 7 pointe désormais vers `docs/conception/`. `nutrition.ts` + 11 tests (58 au total). `needs.ts` + `planner.ts` + 12 tests (70) ; arbitrage `batchBonus` consigné dans SPEC § 8.
