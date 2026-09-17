# Avancement du projet — WSF · Week Shop Food

> Application mobile Android + iOS : programme nutritionnel sur 7 jours + liste de courses hebdomadaire optimisée anti-gaspillage.
> Dernière mise à jour : 2026-09-17

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
