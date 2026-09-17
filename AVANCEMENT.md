# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> Dernière mise à jour : 2026-09-17

## Reprise — état exact et prochaine étape

> Section à mettre à jour **à chaque fin de session**. Toute IA qui reprend doit d'abord lire [CLAUDE.md](CLAUDE.md) § 0 (protocole), puis cette section.

- **Dernier commit** : `ff1964b` — dépôt propre (`git status` vide) au moment de l'écriture.
- **Base vérifiée** : `npm run typecheck` ✅ et `npm test` ✅ sur le scaffold (aucun code métier encore écrit).
- **Ce qui existe** : scaffold Expo SDK 57 nettoyé, `src/app/_layout.tsx` (Stack minimal) et `src/app/index.tsx` (placeholder), thème/hooks du template, docs (`CLAUDE.md`, `AGENT.md`, ce fichier).
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

## Décisions prises

- **Stack** : Expo (React Native) + TypeScript strict, navigation `expo-router` (dossier `src/app/`), une seule base de code pour Android et iOS.
- **État** : `zustand` + persistance `AsyncStorage`. Application **100 % hors-ligne**, aucun backend.
- **Logique métier** en fonctions pures dans `src/core/` (génération du plan, agrégation des courses, conversions d'unités, conditionnements, score anti-gaspillage, nutrition), testée avec `jest-expo`.
- **Données** : base locale de recettes (≥ 60 plats réels, variés, naturels, en français) et d'ingrédients canoniques (rayon, unité, taille de pack, périssabilité, prix indicatif).
- **Langue de l'interface** : français.
- Nom du package : `wsf-week-shop-food`, slug Expo `wsf-week-shop-food`, scheme `wsf`.

## Fait

- [x] Dossier projet initialisé (`git init`, branche `main`, premier commit `da51785`).
- [x] Template Expo `default` SDK 57 extrait manuellement — `create-expo-app` est incompatible avec npm 12 (format de `npm pack --json` changé) et refuse les noms de dossier avec espaces.
- [x] Boilerplate de démo supprimé (écran Explore, composants d'exemple, images React/Expo, script `reset-project`).
- [x] Dépendances ajoutées : `zustand`, `@react-native-async-storage/async-storage`, `expo-haptics`, `@expo/vector-icons` ; dev : `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native`.
- [x] Scripts npm : `test`, `test:watch`, `typecheck`, `doctor` ; config Jest (`preset: jest-expo`).
- [x] `app.json` renommé (WSF – Week Shop Food).
- [x] Base vérifiée : `npx tsc --noEmit` ✅ et `npx jest` ✅ (test de fumée).

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

## Comment lancer

```bash
npm install
npx expo start
```

Puis scanner le QR code avec **Expo Go** (Android/iOS), ou `a` / `i` pour un émulateur.

```bash
npm run typecheck   # vérification TypeScript
npm test            # tests unitaires
```

## Journal

- **2026-09-17** — Cadrage, scaffolding Expo SDK 57, nettoyage du template, dépendances, premier commit. Lancement du workflow de conception (3 propositions indépendantes + synthèse).
- **2026-09-17** — Documentation de reprise : `CLAUDE.md` (manuel, pièges, garde-fous), `AGENT.md` (rôle de l'agent), section « Reprise » ici, `README.md` réécrit. Les 3 propositions de conception sont rendues (UX 07:26, ingénierie 07:29, algorithmes 07:33) ; juge de synthèse en cours.
