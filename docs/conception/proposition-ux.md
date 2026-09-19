# WSF – Week Shop Food — Proposition produit & design (v1)

> Principe directeur : **"Une semaine de vrais plats, une seule liste, zéro reste orphelin."**
> Tout ce qui suit est réalisable 100 % hors-ligne avec Expo + zustand/AsyncStorage + logique pure dans `src/core/`.

---

## 1. Parcours utilisateur complet

### 1.1 Onboarding (6 étapes, ~90 s, skippable après l'étape 2)

Barre de progression en haut (6 points), bouton "Passer" discret à partir de l'étape 3 (les valeurs par défaut s'appliquent). Chaque écran = 1 question, 1 CTA principal en bas "Continuer".

| # | Écran | Question / contenu | Contrôle | Valeur par défaut |
|---|---|---|---|---|
| 0 | Bienvenue | Logo, promesse en 3 lignes : "7 jours de vrais plats · Une liste de courses exacte · Rien ne finit à la poubelle". Illustration panier. | Bouton "Commencer" · lien "J'ai déjà un profil ? Importer" (v2, désactivé) | — |
| 1 | Pour qui cuisinez-vous ? | Nombre de personnes | Stepper 1 → 8 (gros boutons −/+), sous-texte "Les quantités et la liste s'adaptent" | **2** |
| 2 | Votre régime | Omnivore / Végétarien / Végétalien / Sans porc / Pescétarien | Cartes radio (icône + libellé) — sélection unique | **Omnivore** |
| 3 | Allergies & intolérances | Gluten, Lactose, Fruits à coque, Œufs, Arachide, Soja, Fruits de mer, Sésame | Chips multi-sélection, "Aucune" sélectionnée par défaut (se désélectionne au premier choix) | **Aucune** |
| 4 | Votre objectif | Équilibre / Perte de poids / Prise de masse / Budget serré | Cartes radio avec sous-texte ("~1 800 kcal/j", "~1 500 kcal/j", "~2 400 kcal/j, protéines ↑", "≤ 45 €/pers./semaine") | **Équilibre** |
| 5 | Temps en cuisine | "En semaine, combien de temps max par repas du soir ?" | Segmented control : 15 min / 30 min / 45 min / Peu importe · toggle "Le week-end je peux cuisiner plus longtemps" (on) · toggle "Je veux une collation" (off) | **30 min**, week-end libre |
| 6 | Ce que vous n'aimez pas | "On évitera ces ingrédients" | Chips prédéfinies (Coriandre, Champignons, Aubergine, Betterave, Épinards, Poisson, Abats, Chou, Olives, Piment…) + champ "Autre" avec autocomplétion sur la base d'ingrédients | **Aucune** |

Fin d'onboarding → écran de génération (voir 1.2). Le profil est persisté dans le store `profile`. Tous ces choix sont modifiables plus tard dans l'onglet **Profil**.

### 1.2 Génération du plan

1. Écran plein "On compose votre semaine…" avec un `ProgressRing` indéterminé et **3 messages qui s'enchaînent toutes les ~700 ms** (la génération est synchrone et rapide, mais on rend visible le travail anti-gaspi) :
   - "Sélection de 21 plats variés…"
   - "Regroupement des ingrédients périssables…"
   - "Calcul des paquets à acheter…"
2. Résultat : redirection vers l'onglet **Semaine** avec une bannière de succès (toast 4 s) : *"Votre semaine est prête : 21 repas, 34 articles, ~78 € pour 2 personnes."*
3. Le moteur (`src/core/planner`) produit un `WeekPlan` : 7 jours × slots (petit-déj / déjeuner / dîner / [collation]). Contraintes respectées : régime, allergènes, aversions, temps max (semaine vs week-end), objectif calorique ± 10 %, saison courante, **pas deux fois le même plat principal**, **max 2 fois la même famille (ex. "pâtes") par semaine**, et **score anti-gaspillage** (voir 4.1).

### 1.3 Consultation de la semaine

- Onglet **Semaine** : en-tête "Semaine du 14 au 20 sept." + `WeekStrip` (7 pastilles Lun…Dim, la pastille du jour est remplie). Sous le strip, résumé 3 tuiles : *Budget estimé*, *Articles à acheter*, *Score anti-gaspi* (ex. "94 % des ingrédients utilisés").
- Liste verticale par jour : `DaySection` avec 3-4 `MealCard` (image/illustration, nom du plat, durée, kcal/portion, chips "Végé", "Rapide", "Reste de mardi").
- Bouton flottant "Régénérer la semaine" (icône ↻) + menu "…" (Verrouiller les repas cuisinés / Exporter en texte).

### 1.4 Jour

- Tap sur une pastille → écran **Jour** (pile de l'onglet Semaine) : `ProgressRing` macros du jour (kcal, P/G/L) vs objectif, puis les repas en cartes larges avec actions rapides : **Remplacer**, **Cuisiné ✓**, **Voir la recette**.

### 1.5 Détail recette

- Image, titre, chips (cuisine, saison, temps total, difficulté, tags régime).
- **Sélecteur de portions** (stepper, préréglé sur le nb de personnes du profil ; modifiable ponctuellement → la liste de courses se recalcule si on confirme "Appliquer à mon plan").
- Onglets internes : **Ingrédients** / **Étapes** / **Nutrition**.
  - Ingrédients : `IngredientRow` avec quantité ajustée (ex. "Feta — 150 g"), pastille de statut : *dans le garde-manger* (✓ vert), *à acheter*, *reste réutilisé* (icône ♻ + "reste de mardi").
  - Étapes : numérotées, gros texte, minuteur intégré sur les étapes avec durée ("Laisser mijoter 20 min" → bouton "Lancer 20:00", notifications locales Expo).
  - Nutrition : par portion, `MacroBar`.
- Barre du bas : **"Marquer cuisiné"** · **"Remplacer ce repas"**.

### 1.6 Liste de courses

- Onglet **Courses** : en-tête "34 articles · ~78 €" + barre de progression des cases cochées.
- Sections repliables par rayon (`AisleSection`) dans l'ordre d'un parcours magasin type : Fruits & légumes → Boucherie/Poissonnerie → Crèmerie → Épicerie salée → Épicerie sucrée → Boulangerie → Surgelés → Boissons → Hygiène (jamais utilisé en v1 mais réservé).
- Chaque `ShoppingRow` : case à cocher, nom, **"À acheter : 1 paquet (500 g)"** en gras, sous-ligne **"Besoin réel : 380 g · reste ~120 g"** + prix estimé. Tap → bottom-sheet détail : dans quelles recettes, quel jour, quel conditionnement, possibilité de "J'en ai déjà" (→ envoie au garde-manger) ou "Ajuster le pack" (choisir un autre conditionnement de la base, ex. 250 g au lieu de 500 g).
- Section spéciale en bas : **"Restes prévisibles"** — les excédents après agrégation, avec l'indication de réutilisation (ex. "½ botte de persil → utilisé jeudi dans le taboulé") ou une suggestion si aucun repas ne l'utilise (ex. "~120 g de pâtes → parfait pour un déjeuner improvisé ; conserver 12 mois").
- Mode **"En magasin"** (bouton en haut à droite) : plein écran, police plus grande, éléments cochés glissent en bas, écran reste allumé (`expo-keep-awake`).
- Ajout manuel d'un article libre ("Papier alu") via champ en bas.

### 1.7 Garde-manger

- Onglet **Garde-manger** : liste des ingrédients que l'utilisateur possède, groupés par rayon. Chaque ligne : nom, quantité (ex. "Riz — 800 g"), date d'ouverture/limite optionnelle, badge "Bientôt périmé" si `ouvert + périssabilité − 2 j ≤ aujourd'hui`.
- Ajout : recherche dans la base d'ingrédients (autocomplétion locale), choix quantité par pack ou libre.
- Toutes les lignes cochées "Acheté" dans la liste de courses, une fois la semaine validée, sont **proposées** à l'ajout au garde-manger (bandeau "Ajouter les 34 articles achetés ?").
- Quand un repas est marqué "cuisiné", les quantités utilisées sont **décomptées** automatiquement.
- Bouton "Cuisiner avec ce que j'ai" → filtre les recettes de la base faisables à ≥ 80 % avec le garde-manger (voir 4.3).

### 1.8 Réglages / Profil

- Modification de toutes les réponses d'onboarding + : jour de début de semaine (Lundi / jour des courses), devise, affichage des calories (on/off), thème (clair/sombre/système), "Réinitialiser la semaine", "Effacer toutes les données", "À propos & sources nutritionnelles".
- Changement de régime/allergènes → modal : *"Votre plan actuel contient 4 repas incompatibles. Les remplacer maintenant ?"* → [Remplacer] [Plus tard].

### 1.9 Swap d'un repas

1. Depuis MealCard (appui long ou bouton "Remplacer") → bottom-sheet **"Remplacer le dîner de mercredi"**.
2. 3 à 5 alternatives triées par **impact sur la liste** : chaque proposition affiche `+2 articles · +3,40 €` ou `−1 article · −1,20 €` ou `Utilise vos restes de feta ♻`. Filtres rapides : "Plus rapide", "Moins cher", "Avec mes restes", "Surprends-moi".
3. Tap → confirmation inline "Liste mise à jour : 33 articles · ~76 €". Undo possible 5 s (snackbar).
4. Le repas remplacé n'est **jamais** un plat déjà présent la même semaine.

### 1.10 Régénérer la semaine

- Modal : *"Régénérer toute la semaine ?"* avec deux toggles : "Garder les repas déjà cuisinés" (on), "Garder les repas verrouillés" (on, les MealCards ont un cadenas via appui long). Sous-texte : "Les articles déjà cochés dans la liste seront conservés dans le garde-manger."
- Résultat → même écran de génération qu'en 1.2, puis toast.

### 1.11 Marquer un repas "cuisiné"

- Bouton sur MealCard / détail. Effets : carte passe en état "✓ Cuisiné" (opacité 60 %, trait), décompte du garde-manger, le repas est verrouillé pour toute régénération, mise à jour du bilan hebdo (écran Semaine : "12/21 repas cuisinés").
- Si l'utilisateur marque "cuisiné" un plat dont les ingrédients ne sont pas dans le garde-manger → rien de bloquant, simple info "Ingrédients non retrouvés dans le garde-manger, rien n'a été décompté."
- Dimanche soir : bandeau "Bilan de la semaine" (repas cuisinés, restes non utilisés, argent estimé économisé vs achat à l'unité).

---

## 2. Liste exhaustive des écrans & navigation

### 2.1 Structure expo-router

```
app/
  _layout.tsx                 → Stack racine (gère onboarding vs tabs, thème, fonts)
  onboarding/
    _layout.tsx               → Stack sans header
    index.tsx                 (Bienvenue)
    people.tsx  diet.tsx  allergies.tsx  goal.tsx  time.tsx  dislikes.tsx
    generating.tsx            (écran de génération, aussi réutilisé via modal)
  (tabs)/
    _layout.tsx               → Tabs : semaine · courses · garde-manger · profil
    semaine/
      index.tsx               (Semaine)
      jour/[date].tsx         (Jour)
    courses/
      index.tsx               (Liste de courses)
      magasin.tsx             (Mode en magasin — présenté en modal plein écran)
    garde-manger/
      index.tsx
      ajouter.tsx             (recherche + ajout, modal)
    profil/
      index.tsx
      [section].tsx           (regime, allergies, objectif, temps, aversions, donnees, apropos)
  recette/[id].tsx            (Détail recette — Stack au-dessus des tabs, présentation "card")
  swap/[slotId].tsx           (Remplacer un repas — modal bottom-sheet)
  article/[ingredientId].tsx  (Détail article de courses — bottom-sheet)
  bilan.tsx                   (Bilan de la semaine — modal)
```

**4 onglets** (barre du bas, icônes outline → filled à l'actif) :
1. **Semaine** (icône calendrier) — écran par défaut.
2. **Courses** (icône panier, badge = articles restants à cocher).
3. **Garde-manger** (icône placard/bocal, badge rouge si un article périme sous 2 jours).
4. **Profil** (icône personne).

### 2.2 Fiches écrans

| Écran | Objectif | Contenu | Actions | État vide | Erreurs / cas limites |
|---|---|---|---|---|---|
| **Bienvenue** | Poser la promesse | Logo, 3 bénéfices, illustration | Commencer | — | — |
| **Onboarding ×6** | Collecter le profil | 1 question, contrôle, aide contextuelle | Continuer, Retour, Passer (≥ étape 3) | — | Aversions : si l'utilisateur exclut > 60 % des recettes disponibles → alerte "Avec ces choix, il ne reste que 18 plats : la semaine sera moins variée." (non bloquant) |
| **Génération** | Rendre visible le travail anti-gaspi | Ring, 3 messages | Aucune (annulable par retour) | — | Aucune combinaison possible (ex. végétalien + sans gluten + sans soja + sans fruits à coque + 15 min) → écran "Impossible de composer 21 repas avec ces contraintes" + bouton "Assouplir le temps de cuisine" / "Modifier mes allergies" |
| **Semaine** | Vue d'ensemble | Titre semaine, WeekStrip, 3 tuiles résumé, 7 DaySection de MealCards, FAB Régénérer | Tap jour, tap repas, appui long (Remplacer / Verrouiller / Cuisiné), FAB, menu … | "Aucune semaine planifiée" + bouton "Composer ma semaine" (si l'utilisateur a effacé le plan) | Plan périmé (date de fin dépassée) → bandeau jaune "Cette semaine est terminée. Composer la prochaine ?" |
| **Jour** | Détail d'une journée | Date, ProgressRing macros, 3-4 MealCards larges avec actions | Remplacer, Cuisiné, Voir recette, ← → jour précédent/suivant (swipe) | Jour sans repas (impossible en v1) | — |
| **Détail recette** | Cuisiner | Image, meta, stepper portions, onglets Ingrédients/Étapes/Nutrition, barre d'actions | Marquer cuisiné, Remplacer, Lancer minuteur, Ajuster portions, Partager en texte | — | Recette absente de la base (id inconnu après mise à jour de l'app) → "Cette recette n'est plus disponible" + Remplacer |
| **Swap** (modal) | Remplacer un repas | Titre, filtres chips, 3-5 SwapCandidateCard avec delta liste | Choisir, Surprends-moi, Filtrer | "Aucune alternative compatible avec vos contraintes pour ce créneau" + "Assouplir les filtres" | — |
| **Liste de courses** | Acheter juste | En-tête compteur + budget, progress bar, AisleSections, section Restes prévisibles, champ ajout manuel, bouton Mode magasin | Cocher, tap ligne (détail), swipe gauche "J'en ai déjà", ajouter article libre, tout décocher, tout ajouter au garde-manger | "Votre liste est vide" — (a) pas de plan : bouton "Composer ma semaine" ; (b) tout est dans le garde-manger : "Vous avez déjà tout ! Rien à acheter cette semaine." | Article sans conditionnement connu (article libre) → affiché sans prix, sous-texte "Prix inconnu" |
| **Détail article** (bottom-sheet) | Comprendre une ligne | Nom, rayon, À acheter vs Besoin réel, reste prévisible + réutilisation, recettes concernées (jour + quantité), prix, sélecteur de conditionnement | J'en ai déjà, Changer le pack, Retirer (avertit : "Le plat X en a besoin") | — | — |
| **Mode magasin** (modal plein écran) | Cocher vite | Police 20+, un rayon à la fois avec pagination, cochés en bas grisés | Cocher, Rayon suivant, Quitter | — | — |
| **Garde-manger** | Savoir ce qu'on a | Liste par rayon, quantités, badges péremption, bouton "Cuisiner avec ce que j'ai" | Ajouter, Modifier quantité, Supprimer (swipe), Cuisiner avec ce que j'ai | "Garde-manger vide" + explication "Ajoutez ce que vous avez : on le déduira de vos courses" + bouton Ajouter | Quantité négative après décompte → clamp à 0 + suppression proposée |
| **Ajouter au garde-manger** (modal) | Saisie rapide | Champ recherche, résultats (nom + rayon), stepper quantité en packs ou unité libre, date d'ouverture optionnelle | Ajouter, Annuler | "Aucun ingrédient trouvé" + "Ajouter « xxx » comme article libre" | — |
| **Cuisiner avec ce que j'ai** | Anti-gaspi immédiat | Recettes triées par % d'ingrédients disponibles, chips "manque : 1 citron" | Ouvrir recette, Remplacer un repas du plan par celle-ci | "Ajoutez au moins 3 ingrédients pour des suggestions" | — |
| **Profil** | Régler | Sections : Foyer, Régime, Allergies, Objectif, Temps, Aversions, Préférences app, Données, À propos | Naviguer | — | Changement incompatible avec le plan → modal de remplacement (1.8) |
| **Bilan de la semaine** (modal) | Boucler la semaine | Repas cuisinés / 21, restes non utilisés, "≈ 9,40 € économisés grâce aux packs partagés", 1 conseil | Composer la semaine suivante, Fermer | — | — |

---

## 3. Microcopy FR clé

### Titres d'écran
- "Ma semaine" · "Lundi 14 sept." · "Liste de courses" · "Garde-manger" · "Profil"
- "Remplacer le dîner de mercredi" · "Cuisiner avec ce que j'ai" · "Bilan de la semaine"

### Boutons
- "Composer ma semaine" · "Régénérer la semaine" · "Remplacer" · "Surprends-moi" · "Marquer cuisiné" · "Cuisiné ✓"
- "J'en ai déjà" · "Changer le pack" · "Mode magasin" · "Tout ajouter au garde-manger" · "Ajouter un article"
- "Assouplir mes contraintes" · "Continuer" · "Passer" · "Annuler" (undo snackbar)

### Messages anti-gaspillage (générés depuis `src/core/leftovers`)
- "Il vous restera ~150 g de feta : on l'a réutilisée jeudi dans la salade grecque."
- "1 botte de persil suffit pour 3 plats cette semaine."
- "Vous achetez 6 œufs, 5 sont prévus. Le dernier ira dans l'omelette de samedi."
- "Pack de 500 g de pâtes : 380 g utilisés. Le reste se conserve 12 mois, aucun risque."
- "½ courgette restera vendredi : elle est déjà dans la poêlée de dimanche."
- "Ce remplacement utilise vos restes de crème : −1 article, −1,80 €."
- "Ce plat ajoute 3 nouveaux ingrédients périssables. Un autre choix les évite."
- "Vous avez déjà 800 g de riz : rien à acheter au rayon épicerie."
- "Le yaourt ouvert lundi se conserve jusqu'à jeudi. Il est prévu mercredi matin."
- "Semaine terminée : 19 repas cuisinés, 2 restes non utilisés (½ citron, 40 g de parmesan)."

### Résumés & états
- "21 repas · 34 articles · ~78 € pour 2 personnes"
- "94 % des ingrédients achetés seront consommés"
- "Vous avez déjà tout ! Rien à acheter cette semaine."
- "Garde-manger vide — ajoutez ce que vous avez, on le déduira de vos courses."
- "Aucune alternative compatible avec vos contraintes pour ce créneau."
- "Cette semaine est terminée. Composer la prochaine ?"
- "Liste mise à jour : 33 articles · ~76 €"
- "Prix indicatifs, ils varient selon le magasin."

### Erreurs / garde-fous
- "Impossible de composer 21 repas avec ces contraintes. Essayez d'assouplir le temps de cuisine ou les aversions."
- "Le plat « Shakshuka » a besoin de cet article. Le retirer quand même ?"
- "Avec ces choix, il ne reste que 18 plats disponibles : la semaine sera moins variée."
- "Ingrédients non retrouvés dans le garde-manger, rien n'a été décompté."

---

## 4. Ce qui rend WSF remarquable (5 idées concrètes, hors-ligne)

### 4.1 Score anti-gaspillage visible et actionnable
Chaque plan a un score = `Σ(quantité utilisée / quantité achetée)` pondéré par la périssabilité (un reste de pâtes pèse 0, un reste de crème fraîche pèse 1). Le générateur fait N tirages (ex. 40) et garde le meilleur. L'utilisateur voit "94 % utilisés" dans l'onglet Semaine, avec la liste des 2-3 ingrédients les moins bien utilisés et un bouton "Optimiser" qui propose des swaps ciblés. Jow ne montre jamais ça ; Frigo Magic part du frigo mais ne planifie pas.

### 4.2 "À acheter" vs "Besoin réel" sur chaque ligne
La liste dit explicitement *"1 paquet de 500 g — besoin réel 380 g — reste ~120 g → réutilisé jeudi"*. La base d'ingrédients porte les conditionnements réels (œufs ×6, botte, 1 L, 250 g, 500 g), les densités (ml ↔ g), et le moteur `src/core/packaging` choisit le pack minimal couvrant le besoin (ou le meilleur prix/unité si le reste est non périssable). Rendu transparent, c'est un argument de confiance immédiat.

### 4.3 "Cuisiner avec ce que j'ai" + décompte automatique
Le garde-manger est un vrai stock : ajouté à l'achat (un tap après les courses), décompté au "cuisiné". Le bouton "Cuisiner avec ce que j'ai" trie les 60+ recettes par taux de faisabilité et affiche ce qui manque ("manque : 1 citron"). Aucune photo, aucun scan, aucun réseau : ça marche dans la cuisine sans 4G.

### 4.4 Swap "à impact" (delta de liste en temps réel)
Chaque alternative de remplacement affiche son effet sur la liste **avant** de choisir : `+2 articles · +3,40 €` / `Utilise vos restes de feta ♻` / `−1 article`. Calcul pur : `diffShoppingList(currentPlan, candidatePlan)`. Le filtre "Avec mes restes" met en avant les recettes qui consomment les excédents prévisibles.

### 4.5 Mode magasin ordonné par parcours + bilan du dimanche
Rayons dans l'ordre d'un supermarché, police grande, écran maintenu allumé, cochés qui glissent en bas, un rayon par page. Puis, en fin de semaine, un **bilan** local : repas cuisinés, restes vraiment orphelins, "≈ 9,40 € économisés grâce aux ingrédients partagés entre plats". Ce bilan nourrit la génération suivante (les ingrédients "orphelins" récurrents sont pénalisés dans le score).

Bonus réalisable : **verrouillage de repas** (cadenas) et **"Le week-end je cuisine plus"** (deux budgets temps), deux détails que les concurrents gèrent mal.

---

## 5. Design system minimal

### 5.1 Palette (tokens dans `src/theme/tokens.ts`)

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `bg` | `#F7F8F3` (blanc cassé légèrement vert) | `#121611` | Fond écran |
| `surface` | `#FFFFFF` | `#1B211A` | Cartes, sheets |
| `surfaceAlt` | `#EEF2E6` | `#232B22` | Sections repliées, chips inactives |
| `primary` | `#2F6B3A` (vert forêt) | `#7FBF8A` | Boutons principaux, tab active, ring |
| `primarySoft` | `#DCEBDD` | `#24402A` | Fond chips actives, badge "dans le garde-manger" |
| `accent` | `#E8843A` (orange abricot) | `#F2A063` | Restes/réutilisation ♻, FAB, budget |
| `accentSoft` | `#FBE7D6` | `#4A2E1A` | Fond des messages anti-gaspi |
| `text` | `#1E241C` | `#EDF0E8` | Texte principal |
| `textMuted` | `#6B7366` | `#A2AA9C` | Sous-textes, "besoin réel" |
| `border` | `#DDE2D5` | `#2E372C` | Séparateurs, contours |
| `success` | `#3E8E52` | `#8CD09A` | Cuisiné ✓, coché |
| `warning` | `#D9A400` | `#F0C64A` | Périme bientôt, semaine terminée |
| `danger` | `#C7423B` | `#EE8079` | Supprimer, allergène détecté |
| Macros | protéines `#4E7CB8` · glucides `#D9A400` · lipides `#B8654E` | idem +20 % luminosité | ProgressRing, MacroBar |

Contraste texte/fond ≥ 4,5:1 vérifié pour `text` et `primary` sur `bg`.

### 5.2 Typographie
- Police : **Inter** (via `@expo-google-fonts/inter`) — lisible, chiffres tabulaires (`tnum`) pour les quantités et prix.
- Échelle : `display 28/34 SemiBold` (titre de semaine) · `h1 22/28 SemiBold` · `h2 18/24 SemiBold` · `body 16/24 Regular` · `bodyStrong 16/24 Medium` · `caption 13/18 Regular` · `mono-ish` = body + `fontVariant: ['tabular-nums']` pour les quantités.
- Mode magasin : tout ×1,25.
- Espacements : échelle 4 (4, 8, 12, 16, 24, 32). Rayon de bord : 12 (cartes), 20 (chips), 28 (sheets). Ombres légères uniquement en clair (`elevation 2`).

### 5.3 Composants réutilisables (`src/components/`)

| Composant | Props principales | Notes |
|---|---|---|
| `MealCard` | `recipe, slot, state: 'planned'|'cooked'|'locked', onPress, onSwap, onCook, compact?` | Image 4:3 (ou illustration par cuisine si pas d'image), titre 2 lignes max, meta ligne (⏱ 25 min · 540 kcal), chips de tags, ruban "♻ Reste de mardi". Appui long → menu contextuel. État `cooked` : opacité 0,6 + check. |
| `SwapCandidateCard` | `recipe, delta: {items, euros, reusesLeftovers[]}` | Variante de MealCard avec bandeau de delta coloré (vert si ≤ 0, accent si réutilise des restes, muted sinon). |
| `IngredientRow` | `name, quantity, unit, status: 'pantry'|'toBuy'|'leftover'|'none', note?` | Quantité alignée à droite en tabular-nums, pastille de statut à gauche. |
| `ShoppingRow` | `item, checked, onToggle, onPress, onSwipeHave` | Ligne cochable : "À acheter" en gras, "Besoin réel · reste" en caption muted, prix à droite. Swipe gauche "J'en ai déjà". Animation de coche (Reanimated, 150 ms). |
| `AisleSection` | `aisle, items, collapsed, progress` | En-tête sticky avec icône de rayon, compteur "3/6", chevron. Replié automatiquement quand tout est coché. |
| `LeftoverNotice` | `text, kind: 'reused'|'orphan'|'safe'` | Bloc `accentSoft` avec icône ♻ / ⚠ / ✓ — c'est le composant des messages anti-gaspi. |
| `Chip` | `label, selected, onPress, icon?, variant: 'filter'|'tag'|'allergen'` | Hauteur 32, pill. `allergen` en rouge léger. |
| `ProgressRing` | `value, max, size, color, label, indeterminate?` | Anneau SVG (`react-native-svg`), utilisé pour kcal du jour et écran de génération. |
| `MacroBar` | `protein, carbs, fat` (g) | Barre segmentée 3 couleurs + légende. |
| `WeekStrip` | `days[], selectedDate, cookedCount[]` | 7 pastilles horizontales, point sous les jours 100 % cuisinés. |
| `StatTile` | `label, value, hint?, tone?` | Tuiles résumé (Budget / Articles / Score anti-gaspi). |
| `Stepper` | `value, min, max, onChange, unit?` | Personnes, portions, quantités garde-manger. Cibles tactiles 44 pt. |
| `SegmentedControl` | `options, value, onChange` | Temps de cuisine, onglets internes recette. |
| `BottomSheet` | `title, children, snapPoints` | `@gorhom/bottom-sheet` — swap, détail article, ajout garde-manger. |
| `Snackbar` | `message, action?` | Undo swap, confirmations liste. |
| `EmptyState` | `illustration, title, body, cta` | Tous les états vides du tableau §2.2. |
| `PrimaryButton` / `SecondaryButton` / `GhostButton` | `label, onPress, loading?, icon?` | Hauteur 52, rayon 14, primary = `primary` plein, secondary = contour, ghost = texte. |
| `Timer` | `seconds, onDone` | Minuteur d'étape avec notification locale. |

### 5.4 Iconographie & illustration
- Icônes : `@expo/vector-icons` (Ionicons outline/filled) pour les tabs et actions ; jeu d'icônes de rayons dessinées en SVG (carotte, fromage, bocal, pain, flocon, bouteille).
- Recettes sans photo : 8 illustrations vectorielles par cuisine (française, méditerranéenne, asiatique, orientale, indienne, latino, petit-déjeuner, collation) dans un dégradé `primarySoft → surfaceAlt`, pour rester 100 % local et léger.

### 5.5 Accessibilité & retours
- Toutes les cibles ≥ 44 pt, labels `accessibilityLabel` sur les cases ("Feta, 1 paquet de 200 g, non coché").
- Retour haptique léger (`expo-haptics`) à la coche et au "Cuisiné".
- Dynamic Type respecté jusqu'à 130 % sans troncature des quantités (les prix passent sous le nom si nécessaire).
- Mode sombre complet via les tokens ci-dessus, thème choisi dans Profil.
