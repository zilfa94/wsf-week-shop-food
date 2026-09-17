# WSF · Week Shop Food

Application mobile **Android + iOS** (Expo / React Native / TypeScript) qui construit votre **programme nutritionnel de la semaine** (7 jours, vrais plats variés et naturels) et génère la **liste de courses** correspondante, **organisée pour ne rien gaspiller** : quantités agrégées et arrondies aux conditionnements réels, produits périssables réutilisés d'un repas à l'autre, déduction du garde-manger, suggestions pour les restes, remplacement d'un repas avec recalcul de la liste, rayons du magasin, estimation du budget.

100 % hors-ligne, sans compte ni backend. Interface en français.

## Démarrer

```bash
npm install
npx expo start
```

Scannez le QR code avec **Expo Go** (Android / iOS), ou appuyez sur `a` (émulateur Android) / `i` (simulateur iOS).

## Vérifier

```bash
npm run typecheck   # TypeScript strict
npm test            # tests unitaires (jest-expo)
```

## Documentation

| Fichier | Contenu |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Manuel de reprise : protocole, décisions figées, arborescence, commandes, pièges, garde-fous |
| [AVANCEMENT.md](AVANCEMENT.md) | État du projet, fait / en cours / à faire, prochaine étape, journal |
| [AGENT.md](AGENT.md) | Rôle, mission et méthode de l'agent IA qui développe le projet |
| `docs/SPEC.md` | Spécification définitive (écrans, types, données, algorithmes, tests) |

## Structure

```
src/app/         routes expo-router (écrans)
src/core/        logique métier pure et testée (plan, courses, unités, packs, gaspillage, nutrition)
src/data/        ingrédients canoniques et recettes (français)
src/store/       état zustand + persistance AsyncStorage
src/components/  composants UI
```
