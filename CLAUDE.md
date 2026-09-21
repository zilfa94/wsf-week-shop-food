# CLAUDE.md — Manuel de reprise du projet WSF · Week Shop Food

> **À lire en premier par toute IA (ou humain) qui reprend ce projet.** Ce fichier est chargé automatiquement par Claude Code. Il contient tout ce qu'il faut savoir pour continuer le travail **sans casser l'existant**.
> Documents liés : [AVANCEMENT.md](AVANCEMENT.md) (état exact et prochaine étape), [AGENT.md](AGENT.md) (rôle et méthode de l'agent), `docs/SPEC.md` (spécification définitive, produite par le workflow de conception).

---

## 0. Protocole de reprise (à suivre dans l'ordre, à chaque reprise)

1. **Lire** ce fichier en entier, puis [AVANCEMENT.md](AVANCEMENT.md) → section « Reprise » (état exact + prochaine étape), puis `docs/SPEC.md` si elle existe.
2. **Vérifier l'état du dépôt** : `git status --short` et `git log --oneline | head -20`. Un `git status` non vide signifie qu'un travail a été interrompu : lire le diff (`git diff`) avant toute action, ne jamais `git checkout --` / `git reset --hard` sans avoir compris ce qui s'y trouve.
3. **Reconstituer la base** : `npm install` (si `node_modules/` manque), puis recréer `expo-env.d.ts` s'il est absent (§ 4.3), puis `npm run typecheck` et `npm test`. **Ces deux commandes doivent être vertes avant de toucher au code.** Si elles ne le sont pas, c'est le premier chantier ; le noter dans AVANCEMENT.md.
4. **Reprendre à la « Prochaine étape »** d'AVANCEMENT.md. Ne pas refaire ce qui est coché « fait ». Ne pas changer les décisions du § 2 sans accord explicite du propriétaire.
5. **Avant de terminer une session** : `npm run typecheck` + `npm test` verts, mise à jour de la partie rédigée d'AVANCEMENT.md (section « Reprise », cases, journal daté), `npm run docs:status`, commit. Une session ne se termine jamais avec un état non documenté — des hooks le vérifient (§ 8).

### 0.1 Quota et coupures (mode économe, décision du propriétaire du 2026-09-19)

- **Rythme** : avant chaque grosse étape, lire l'usage (outil `get_usage` de l'app : fenêtre 5 h et hebdomadaire). S'arrêter proprement vers **85 % de la fenêtre 5 h** (AVANCEMENT.md à jour + commit) et indiquer l'heure de reprise. **Commiter à chaque étape cohérente**, pas seulement en fin de session.
- **Mode économe** : l'agent principal écrit lui-même spec, core, store, écrans ; seules les tâches mécaniques volumineuses (recettes, ingrédients) sont déléguées à 2-3 agents Sonnet. Pas de panels adversariaux multi-agents : `tsc` + `jest` font foi. Ne pas relancer de workflow massif sans accord explicite.
- **Budget des agents** (mesuré le 2026-09-19) : un agent Sonnet « données » consomme ~160 k tokens, surtout en lectures/`grep` ; 3 agents en parallèle lancés à 55 % de la fenêtre ont provoqué une coupure. Règles : lui donner dans le prompt tout ce qu'il doit savoir (table compacte des ingrédients, règles, format) et lui interdire d'explorer ; ne lancer des agents en parallèle que si la fenêtre 5 h est < 50 % ; compter ~8 % de fenêtre par agent.
- **Reprise après coupure** : le propriétaire écrit simplement « Reprends, on a été interrompu par le quota ». Même session → relire `git status` / `git diff` (ce qui a été écrit avant la coupure) et continuer. Nouvelle session → protocole § 0 complet (AVANCEMENT.md « Reprise » + état git + typecheck/tests). Les fichiers non commités au moment de la coupure sont sur le disque : ne jamais les écraser sans avoir lu le diff.

---

## 1. Le projet en trois phrases

Application mobile **Android + iOS** (une seule base de code Expo / React Native / TypeScript). Elle propose un **programme nutritionnel sur 7 jours** (vrais plats variés et naturels) et génère la **liste de courses hebdomadaire** correspondante. Sa valeur principale : **organiser les courses pour éviter tout gaspillage** d'argent et de produits (agrégation, arrondi aux conditionnements réels, réutilisation des périssables entre repas, garde-manger, restes, swap de repas, rayons, budget).

Interface et données **en français**. L'application **fonctionne hors-ligne** (plan, liste, garde-manger, prix indicatifs) et, **depuis la décision du propriétaire du 2026-09-20**, actualise en option les **prix réels par magasin** depuis un flux JSON statique produit par un **scraper planifié** (`scraper/`, GitHub Actions → GitHub Pages). Pas de serveur applicatif, pas de base de données distante, pas de compte utilisateur.

---

## 2. Décisions figées (ne pas remettre en cause sans accord du propriétaire)

| Sujet | Décision |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19, TypeScript strict (`tsconfig.json` étend `expo/tsconfig.base`) |
| Navigation | `expo-router`, racine des routes dans **`src/app/`** (pas `app/`), onglets classiques `Tabs` d'`expo-router` (pas les `NativeTabs` instables du template) |
| Alias | `@/*` → `./src/*`, `@/assets/*` → `./assets/*` (déclaré **avant** `@/*` dans `tsconfig.json` : jest-expo convertit les `paths` dans l'ordre, sinon `@/assets/…` est cherché dans `src/`) |
| Design (refonte 2026-09-20) | Modèle « Food Delivery App UI/UX » du propriétaire : fond gris clair, cartes blanches arrondies à ombre douce, accent jaune `#FFC529` avec texte anthracite, barre d'onglets à bouton central « + » ; images PNG des produits = Fluent Emoji 3D (MIT) via `scripts/food-images.py`. Détail dans `docs/SPEC.md` § 6. |
| État | `zustand` (v5) + persistance `@react-native-async-storage/async-storage` |
| Logique métier | Fonctions **pures** dans `src/core/`, sans import React/RN, testées avec `jest` |
| Données | Locales, typées, en français : `src/data/ingredients.ts`, `src/data/recipes*.ts` (≥ 60 recettes ; 100 depuis le 2026-09-21, dont une deuxième série `recipes-<cuisine>-plus.ts` par famille) |
| Liste de courses | **Dérivée** du plan + garde-manger via sélecteur ; on ne persiste que l'état « coché » |
| Prix réels (décision 2026-09-20) | Scraping des sites drive **par enseigne** dans `scraper/` (Node + Playwright, dépendances isolées de l'app), exécuté par GitHub Actions (cron), résultat publié en JSON statique sur GitHub Pages ; l'app le télécharge (`src/services/`), le met en cache et retombe sur `Packaging.price` si un prix manque. Chaque enseigne est un robot séparé : une enseigne qui bloque (ex. Carrefour, anti-bot) est simplement absente. Robots identifiés, cadence quotidienne, pas de proxies payants. **Règle de crédibilité (propriétaire, 2026-09-20) : aucun prix inventé ni estimé à la place d'un relevé ; un prix affiché porte toujours son magasin, son enseigne et sa date de relevé ; un article sans relevé n'affiche pas de prix réel ; l'utilisateur ne choisit pas d'enseigne, l'app montre celles pour lesquelles des prix existent.** Les seuls prix publiés en ligne par les enseignes sont ceux de leurs drives / sites (rattachés à un magasin physique) : ils sont présentés comme tels (« prix drive du magasin X »), jamais comme des prix relevés en rayon. Dépôt GitHub du propriétaire : `zilfa94`. |
| Tests | `jest-expo` (preset), tests dans des dossiers `__tests__/` avec suffixe `.test.ts(x)` |
| Icônes | `@expo/vector-icons` (Ionicons) |
| Retour haptique | `expo-haptics` |
| Langue du code | Identifiants en anglais, textes UI / commentaires / commits en français |

---

## 3. Arborescence et rôle des dossiers

```
WSF-Week Shop Food/
├── AGENT.md            rôle et méthode de l'agent IA
├── AVANCEMENT.md       état du projet, journal, PROCHAINE ÉTAPE (source de vérité)
├── CLAUDE.md           ce manuel
├── README.md           présentation courte pour humains
├── docs/SPEC.md        spécification définitive (à produire / produite par le workflow de conception)
├── app.json            config Expo (nom, slug wsf-week-shop-food, scheme wsf, plugins)
├── package.json        dépendances, scripts, config jest (bloc "jest")
├── tsconfig.json       strict + alias
├── expo-env.d.ts       GÉNÉRÉ, gitignoré, requis par tsc (voir § 4.3)
├── scripts/docs.mjs    outillage doc : bloc auto d'AVANCEMENT.md, garde-fous, hooks (§ 8)
├── scripts/food-images.py  télécharge/réduit les PNG des produits (Fluent Emoji 3D, MIT) et génère src/data/food-images.ts (Python 3 + Pillow, à relancer seulement pour un nouvel ingrédient / recette)
├── .githooks/          pre-commit (activé par `npm install` via le script `prepare`)
├── .claude/settings.json  hook Stop de Claude Code (§ 8) — settings.local.json est personnel, gitignoré
├── assets/             icône, splash, favicon ; images/food/ = PNG des produits et plats (versionnés, LICENSE.md)
├── scraper/            projet Node SÉPARÉ (prix réels) : src/ (robots, contrat PriceFile), config/ingredients.json, tests node:test — exclu du tsc et du jest de l'app
├── .github/workflows/scrape.yml  cron quotidien : scraper → JSON dans la branche gh-pages (prices/)
└── src/
    ├── app/            routes expo-router : _layout.tsx (racine), (tabs)/…, recette/[id].tsx, onboarding…
    ├── core/           logique métier pure : types.ts (CONTRAT), units.ts, nutrition.ts, planner.ts, shopping.ts…
    │   └── __tests__/  tests unitaires du core
    ├── data/           ingrédients canoniques + recettes (fichiers TS typés)
    ├── store/          zustand : slices profil / plan / courses / garde-manger / réglages + persistance
    ├── components/     composants UI réutilisables
    ├── constants/theme.ts, hooks/  thème et hooks (issus du template, à faire évoluer)
    └── global.css      variables de police web (importé par constants/theme.ts)
```

**Ordre de dépendance** (ne jamais l'inverser) : `core/types.ts` → `data/` + `core/*` → `store/` → `components/` → `app/`.

---

## 4. Commandes et pièges connus (environnement Windows 11, Node 24, npm 12)

### 4.1 Commandes

```bash
npm install            # dépendances
npm run typecheck      # tsc --noEmit  → doit être vert
npm test               # jest         → doit être vert
npx expo start         # serveur de dev ; scanner le QR avec Expo Go (Android/iOS)
npx expo-doctor        # diagnostic des versions Expo
npx expo export        # valide que le bundle se construit (dossier dist/, gitignoré)
npx expo install <pkg> # TOUJOURS ceci (et pas npm install) pour une dépendance Expo/RN → version compatible SDK
```

### 4.2 Pièges d'environnement

- **Le dossier du projet contient des espaces** (`WSF-Week Shop Food`) : toujours mettre les chemins entre guillemets. `create-expo-app` refuse ce nom → **ne jamais relancer `create-expo-app` ici** ; le template a été extrait manuellement (voir journal d'AVANCEMENT.md).
- **npm 12 + create-expo-app** : `npm pack --json` a changé de format ; `create-expo-app` échoue (« Could not parse JSON »). Contournement utilisé : `npm pack expo-template-default@57.0.25` + `tar -xzf … --strip-components=1`.
- **Shell** : le Bash tool est Git Bash (syntaxe POSIX). PowerShell 5.1 n'accepte ni `&&` ni `||` entre commandes.
- **Fins de ligne** : `core.autocrlf=false` est configuré localement ; les fichiers sont en LF. Ne pas convertir en CRLF.
- **`npx expo install … -- --save-dev` ne place PAS les paquets en devDependencies** : vérifier `package.json` après coup et déplacer à la main si besoin.

### 4.3 `expo-env.d.ts` (fréquent après un clone)

Le fichier est gitignoré mais **indispensable à `tsc`** (déclarations `expo/types`, dont l'import de `global.css`). S'il manque, `npm run typecheck` échoue avec `TS2882 … '@/global.css'`. Le recréer :

```bash
printf '/// <reference types="expo/types" />\n' > expo-env.d.ts
```

(`npx expo start` le régénère aussi automatiquement.)

### 4.4 Jest

- Config dans le bloc `"jest"` de `package.json` : preset `jest-expo`, `testMatch` = `**/__tests__/**/*.test.ts(x)`, `transformIgnorePatterns` étendu (inclut `zustand`).
- Le premier run est lent (~15 s) : normal.
- Les tests du core ne doivent importer **aucun** module React Native ; sinon ils deviennent lents et fragiles.
- `jest.setup.ts` (référencé par `setupFilesAfterEnv`) mocke AsyncStorage et expo-haptics ; `moduleNameMapper` renvoie les imports `.css` (`src/global.css` via `constants/theme.ts`) vers `jest.css-stub.js`.
- **Jest 29 n'accepte pas `expect(valeur, message)`** (syntaxe Vitest) : accumuler les violations dans un tableau et faire `expect(problems).toEqual([])` (voir les tests de `src/data/`).
- **`scraper/` a son propre `tsconfig`, ses propres dépendances et ses tests `node:test`** (`cd scraper && npm test`). Le `tsconfig.json` racine l'exclut (`exclude`) et le bloc jest l'ignore (`modulePathIgnorePatterns`) : sinon `tsc` racine échoue sur `node:*` / `.ts` et jest tente d'exécuter ses tests. Ne jamais importer `scraper/` depuis `src/`.
- **`@testing-library/react-native` 14 : `render` et `fireEvent.*` sont asynchrones** (`await render(...)`, `await fireEvent.press(...)`) ; `screen` n'est pas alimenté, utiliser le retour de `render`. `Pressable` normalise `accessibilityState` (`busy`, `checked`, … à `undefined`) : comparer avec `toMatchObject`.

### 4.5 Expo / expo-router

- Racine des routes : `src/app/`. Un fichier = une route. `_layout.tsx` racine doit envelopper l'app (thème, providers, `Stack`).
- `experiments.typedRoutes: true` et `reactCompiler: true` sont activés dans `app.json` — le compilateur React interdit certaines mutations pendant le rendu ; garder les composants purs.
- `react-native-reanimated` 4 + `react-native-worklets` sont déjà installés par le template ; ne pas ajouter de plugin Babel manuel (Expo le gère).
- `AsyncStorage` fonctionne sur web via `localStorage` ; le web n'est pas une cible prioritaire mais ne doit pas planter.

---

## 5. Règles de modification (garde-fous anti-erreurs)

1. **`src/core/types.ts` est le contrat.** Toute modification impose : `npm run typecheck` sur tout le projet + mise à jour des données, du core, du store et des écrans impactés + tests. Ne jamais y ajouter un champ optionnel « pour aller vite » sans le documenter.
2. **Aucune logique métier dans les écrans ou le store** : elle va dans `src/core/` avec un test. Le store appelle le core.
3. **Déterminisme** : la génération du plan prend une `seed` ; pas de `Math.random()` / `Date.now()` non injecté dans le core (sinon les tests deviennent non reproductibles).
4. **Unités** : toute quantité passe par la table de conversion de `src/core/units.ts` ; ne jamais additionner deux quantités d'unités différentes sans conversion.
5. **Données** : chaque `RecipeIngredient` référence un `ingredientId` existant dans `src/data/ingredients.ts` ; un test d'intégrité des données doit le vérifier. Ajouter une recette = respecter le format, les tags, les macros approximatives et la saison.
6. **Persistance** : toute évolution de la forme de l'état persisté impose d'incrémenter la `version` du store zustand et d'écrire une `migrate`.
7. **Pas de nouvelle dépendance** sans justification écrite dans AVANCEMENT.md ; jamais de dépendance réseau / analytics / backend.
8. **Fichiers partagés** (`package.json`, `app.json`, `tsconfig.json`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`) : modifiés uniquement par l'agent principal lors de l'intégration, jamais par des sous-agents en parallèle.
9. **Travail parallèle** (workflows) : un fichier appartient à un seul agent. Le contrat de types est écrit et validé **avant** de lancer les implémenteurs.
10. **Ne jamais déclarer « terminé »** sans `typecheck` + `test` verts et sans avoir relancé les tests existants (pas seulement les nouveaux).

---

## 6. Conventions

- **Commits** : message en français, impératif, corps optionnel expliquant le pourquoi ; dernière ligne `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` quand l'IA a contribué. Un commit par étape cohérente. Pas de push sans demande. **Jamais `--no-verify`** ni `WSF_SKIP_DOCS_CHECK` de la part de l'IA : si le pre-commit refuse, c'est que la doc n'est pas à jour — la mettre à jour.
- **Nommage** : fichiers `kebab-case.ts(x)`, types `PascalCase`, fonctions/variables `camelCase`, constantes `UPPER_SNAKE` uniquement pour de vraies constantes.
- **Composants** : un composant exporté par fichier, props typées, pas de style inline hors cas trivial ; couleurs et espacements depuis le thème.
- **Textes UI** : français, avec typographie française (espace avant `:` `;` `!` `?`, guillemets « »).

---

## 7. Où trouver quoi quand un artefact manque

| Manque | Où le retrouver / quoi faire |
|---|---|
| `docs/SPEC.md` absent ou incomplet | Les 3 propositions brutes sont versionnées dans `docs/conception/` ; la spec est un arbitrage de ces propositions + le contrat `src/core/types.ts`. La réécrire à partir de là (mode économe : par l'agent principal, sans workflow). |
| `node_modules/` absent | `npm install` (le `package-lock.json` est versionné). |
| `expo-env.d.ts` absent | § 4.3. |
| Tests rouges après reprise | Lire la sortie ; ne pas supprimer/ignorer un test pour le faire passer ; corriger le code ou, si la spec a changé, le test **et** la spec. |
| Doute sur une décision | § 2 de ce fichier, puis AVANCEMENT.md « Décisions prises » ; sinon demander au propriétaire. |

## 8. Mise à jour de la documentation : ce qui est automatique, ce qui reste à rédiger

**Principe** : une info vit à un seul endroit. Les règles/décisions/commandes/pièges sont dans ce fichier (stable). L'**état** est dans AVANCEMENT.md (change souvent) et c'est **le seul fichier à tenir à jour au quotidien**. README.md et AGENT.md ne sont que des pointeurs.

| Quoi | Qui | Comment |
|---|---|---|
| Bloc « État instantané » d'AVANCEMENT.md (date, branche, dernier commit, arbre propre/sale, compteurs de code, dernier résultat typecheck/tests) | **Automatique** | `npm run docs:status` (rapide) ou `npm run docs:verify` (lance aussi `tsc` + `jest` et enregistre le résultat). Le pre-commit le régénère et l'indexe à chaque commit. Ne jamais l'éditer à la main. |
| Section « Reprise » (ce qui existe / n'existe pas / en cours, **prochaine étape**), cases Fait / En cours / À faire, ligne de **Journal** datée | **Rédigé** (IA ou humain) | À chaque étape franchie et à chaque fin de session. C'est le contenu que les garde-fous exigent. |
| Ce manuel (CLAUDE.md) | Rédigé, rare | Uniquement quand une décision, une règle, une commande ou un piège change. |

**Garde-fous** (`scripts/docs.mjs`) — règle unique : *si du code change (`src/`, `assets/`, `package.json`, `app.json`, `tsconfig.json`), la partie rédigée d'AVANCEMENT.md doit avoir changé depuis le dernier commit.*

- **Hook git `pre-commit`** (`.githooks/pre-commit`, activé par `git config core.hooksPath .githooks`, que `npm install` exécute via le script `prepare`) : régénère le bloc auto, l'indexe, puis **refuse le commit** si la règle n'est pas respectée, avec la marche à suivre. Après un clone : `npm install` suffit ; sinon `npm run prepare`.
- **Hook Claude Code `Stop`** (`.claude/settings.json`) : à chaque fin de tour de l'IA, même règle sur l'arbre de travail. Si elle n'est pas respectée, le hook renvoie `decision: block` avec la marche à suivre → l'IA continue et met la doc à jour avant de s'arrêter (une seule relance, pas de boucle : `stop_hook_active`). Une IA qui n'exécute pas les hooks Claude Code reste protégée par le pre-commit.
- Contournement d'urgence, **réservé au propriétaire** : `WSF_SKIP_DOCS_CHECK=1 git commit …` (l'IA n'a pas le droit de l'utiliser, ni `--no-verify`).

**Procédure minimale quand le hook refuse** : 1) éditer AVANCEMENT.md (« Reprise » + cases + une ligne de journal datée) ; 2) `npm run docs:status` ; 3) relancer le commit.
