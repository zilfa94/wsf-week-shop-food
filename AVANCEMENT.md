# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> **Ce fichier est la source de vérité de l'ÉTAT du projet.** Les décisions, commandes, pièges et règles vivent dans [CLAUDE.md](CLAUDE.md) (ne pas les dupliquer ici). Mécanisme de mise à jour : CLAUDE.md § 8.

## État instantané (automatique)

<!-- auto:start — généré par `npm run docs:status`, NE PAS ÉDITER À LA MAIN -->
- Généré le : 2026-09-19 08:15
- Branche : `main` — dernier commit : 2adf8a8 « Corrige le hook Stop (comparaison normalisée, sortie non tronquée) et documente le mécanisme » (2026-09-17)
- Arbre de travail : 16 fichier(s) modifié(s) non commité(s)
- Code : core 5 fichier(s) · tests 30 cas dans 4 fichier(s) · données ≈ 0 recette(s), ≈ 0 ingrédient(s) · routes 1 · composants 0 · store 0
- Vérification : non exécutée (`npm run docs:verify`)
<!-- auto:end -->

## Reprise — état exact et prochaine étape

> Partie rédigée, à mettre à jour **à chaque fin de session** (les hooks refusent un commit / une fin de session si du code a changé sans elle). Toute IA qui reprend lit d'abord [CLAUDE.md](CLAUDE.md) § 0, puis cette section.

- **Ce qui existe** : scaffold Expo SDK 57 nettoyé, `src/app/_layout.tsx` (Stack minimal) et `src/app/index.tsx` (placeholder), thème/hooks du template, docs (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier), outillage `scripts/docs.mjs` + hooks (git pre-commit, Claude Code Stop). **Depuis le 2026-09-19** : les 3 propositions de conception copiées dans `docs/conception/` ; le **contrat de types** `src/core/types.ts` (arbitrage des propositions algo + ingénierie, identifiants anglais, `cooked`/`unfilled`/`packagingIndex`/`ManualItem` ajoutés) ; modules de base `src/core/rng.ts`, `date.ts`, `units.ts`, `packaging.ts` avec fixtures et 30 tests verts ; `tsconfig.json` : `"types": ["jest"]` (TypeScript 6 n'inclut plus les `@types/*` automatiquement).
- **Ce qui n'existe pas encore** : `docs/SPEC.md`, le reste de `src/core/` (filter, nutrition, planner, shopping, swap, leftovers, report, labels, params), `src/data/`, `src/store/`, `src/components/` (hors template), écrans.
- **Constat de la reprise du 2026-09-19** : le juge de synthèse du workflow `wf_4122c8d8-7cf` a **échoué** (erreur 429 « weekly limit » le 17/09, aucune synthèse écrite) ; les 3 propositions brutes sont intactes dans son `journal.jsonl` (CLAUDE.md § 7). `npm test` est **rouge** (« No tests found », exit 1) : le test de fumée cité ci-dessous n'a jamais été commité — se corrige avec les premiers tests du module `types`/`units`. `npm run typecheck` est vert.
- **En cours au moment de l'écriture** : workflow de synthèse `wf_204fbc5c-27c` (session `faa12641-9515-4c9b-abf9-c20950e15a0b`) qui remplace le juge : contrat de types → 3 vérifications adversariales → correction → 6 sections de spec en parallèle → 2 critiques de cohérence → correcteur. Sorties dans le scratchpad de la session, sous-dossier `conception/spec/` (`00-types.ts`, `00-types-decisions.md`, `S1-produit.md` … `S6-tests-modules.md`), à assembler dans `docs/SPEC.md`.

**Prochaine étape (dans l'ordre)** — mode économe (CLAUDE.md § 0.1) :
1. Écrire `docs/SPEC.md` (arbitrage concis des 3 propositions de `docs/conception/`, le contrat étant `src/core/types.ts`).
2. Core, par l'agent principal, un module + ses tests à la fois : `labels`, `params`, `filter`, `nutrition`, `planner`, `shopping`, `swap`, `leftovers`, `report` (source : `docs/conception/proposition-algo.md` adaptée aux noms de `types.ts`).
3. Données : `src/data/aisles.ts`, `ingredients.ts` (~150), `recipes-*.ts` (≥ 60) — déléguer la rédaction à 2-3 agents **Sonnet** avec le test d'intégrité `src/data/__tests__/dataset.test.ts` écrit AVANT par l'agent principal.
4. Store zustand + persistance + tests ; thème + composants ; écrans ; intégration (`_layout.tsx`, `(tabs)/_layout.tsx`, `package.json` : `npx expo install --fix` pour les 4 paquets en retard de patch signalés par `expo-doctor` le 19/09).
5. `typecheck`, `test`, `expo-doctor`, `expo export`, test Expo Go, mise à jour de ce fichier, commit.

## Statut global

| Phase | État | Détail |
|---|---|---|
| 0. Cadrage | ✅ Terminé | Objectif produit, contraintes techniques fixées |
| 1. Scaffolding technique | ✅ Terminé | Projet Expo SDK 57 + TypeScript strict, dépendances installées, base vérifiée |
| 2. Conception (spec) | 🔄 En cours | Panel de 3 designers (UX / algorithmes / ingénierie) + juge qui synthétise la spec définitive |
| 3. Implémentation | ⏳ À venir | Modules parallèles : types → données + logique métier → store → écrans |
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

## En cours

- [ ] **Spec définitive** (workflow de conception) : vision, écrans, design system, `src/core/types.ts`, format des données recettes/ingrédients, algorithmes (plan 7 jours, agrégation courses, packs, restes, swap, nutrition), store, tests, découpage en modules parallèles.

## À faire

- [x] Module `types` (contrat entre modules) — implémenté seul, en premier (2026-09-19), avec `rng`, `date`, `units`, `packaging` et 30 tests.
- [ ] `docs/SPEC.md` (arbitrage concis ; les propositions détaillées sont dans `docs/conception/`).
- [ ] Données : ingrédients canoniques + recettes (scindées par cuisine/slot pour paralléliser, agents Sonnet).
- [ ] Core : labels, params, filter, nutrition, planificateur 7 jours, agrégation des courses + garde-manger + restes + swap + bilan.
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
- **2026-09-19** — Reprise (protocole CLAUDE.md § 0) : dépôt propre, typecheck vert, `npm test` rouge (aucun test). Le juge de synthèse `wf_4122c8d8-7cf` avait échoué sur quota sans rien produire ; propositions récupérées, relues et copiées dans `docs/conception/`. Workflow de synthèse `wf_204fbc5c-27c` lancé puis **arrêté** à la demande du propriétaire (quota 5 h à 50 %) : passage en **mode économe** (CLAUDE.md § 0.1), l'agent principal joue le juge lui-même. Contrat `src/core/types.ts` + `rng`/`date`/`units`/`packaging` + 30 tests ; `tsconfig.json` `types: ["jest"]`. typecheck ✅ tests ✅.
