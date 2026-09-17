# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> **Ce fichier est la source de vérité de l'ÉTAT du projet.** Les décisions, commandes, pièges et règles vivent dans [CLAUDE.md](CLAUDE.md) (ne pas les dupliquer ici). Mécanisme de mise à jour : CLAUDE.md § 8.

## État instantané (automatique)

<!-- auto:start — généré par `npm run docs:status`, NE PAS ÉDITER À LA MAIN -->
- Généré le : 2026-09-17 07:46
- Branche : `main` — dernier commit : 7c77656 « Outillage de mise à jour de la documentation » (2026-09-17)
- Arbre de travail : 2 fichier(s) modifié(s) non commité(s)
- Code : core 0 fichier(s) · tests 0 cas dans 0 fichier(s) · données ≈ 0 recette(s), ≈ 0 ingrédient(s) · routes 1 · composants 0 · store 0
- Vérification : non exécutée (`npm run docs:verify`)
<!-- auto:end -->

## Reprise — état exact et prochaine étape

> Partie rédigée, à mettre à jour **à chaque fin de session** (les hooks refusent un commit / une fin de session si du code a changé sans elle). Toute IA qui reprend lit d'abord [CLAUDE.md](CLAUDE.md) § 0, puis cette section.

- **Ce qui existe** : scaffold Expo SDK 57 nettoyé, `src/app/_layout.tsx` (Stack minimal) et `src/app/index.tsx` (placeholder), thème/hooks du template, docs (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier), outillage `scripts/docs.mjs` + hooks (git pre-commit, Claude Code Stop).
- **Ce qui n'existe pas encore** : `docs/SPEC.md`, `src/core/`, `src/data/`, `src/store/`, `src/components/` (hors template), écrans.
- **En cours au moment de l'écriture** : workflow de conception `wf_4122c8d8-7cf` — les 3 propositions (UX, algorithmes, ingénierie) sont rendues ; le juge de synthèse tourne. Résultats bruts dans le `journal.jsonl` indiqué dans CLAUDE.md § 7.

**Prochaine étape (dans l'ordre)** :
1. Récupérer la synthèse du juge → écrire `docs/SPEC.md` (spec) et conserver le découpage en modules.
2. Implémenter **seul, en premier** le module `types` (`src/core/types.ts`, `src/core/units.ts`) + `npm run typecheck`.
3. Lancer l'implémentation **parallèle** des modules à fichiers disjoints (données, core, store, thème/composants, écrans), chacun avec ses tests.
4. Intégration par l'agent principal (layouts `expo-router`, `package.json`), puis `typecheck`, `test`, `expo-doctor`, `expo export`.
5. Revue adversariale, corrections, mise à jour de ce fichier, commit.

Si la synthèse du juge est introuvable : relancer une conception selon [AGENT.md](AGENT.md) § 4 (3 angles + juge) en réutilisant les propositions brutes du journal si elles existent.

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
- [x] Base vérifiée : `npx tsc --noEmit` ✅ et `npx jest` ✅ (test de fumée).
- [x] Documentation de reprise (`CLAUDE.md`, `AGENT.md`, `README.md`, ce fichier).
- [x] Outillage doc : bloc auto-généré, hook git pre-commit, hook Claude Code Stop (`scripts/docs.mjs`).

## En cours

- [ ] **Spec définitive** (workflow de conception) : vision, écrans, design system, `src/core/types.ts`, format des données recettes/ingrédients, algorithmes (plan 7 jours, agrégation courses, packs, restes, swap, nutrition), store, tests, découpage en modules parallèles.

## À faire

- [ ] Module `types` (contrat entre modules) — implémenté seul, en premier.
- [ ] Données : ingrédients canoniques + recettes (scindées par cuisine/slot pour paralléliser).
- [ ] Core : nutrition, planificateur 7 jours, agrégation des courses + garde-manger + restes + swap.
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
- **2026-09-17** — (test du garde-fou, ligne à supprimer)
