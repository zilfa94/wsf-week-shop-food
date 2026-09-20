# scraper/ — relevé des prix réels

Projet Node séparé de l'app (aucune dépendance ici n'entre dans le bundle Expo). Il produit des fichiers JSON statiques que l'app télécharge.

- Contrat des fichiers : `src/types.ts` (`PriceFile`, `PriceEntry`, `PriceIndex`).
- Règles de rattachement produit → ingrédient : `config/ingredients.json` (une règle par ingrédient de `src/data/ingredients.ts`).
- Robots : `src/lidl.ts` (offres en supermarché, portée nationale) ; `src/auchan.ts` (drive d'hypermarché et click & collect de supermarché les plus proches de chaque code postal de `config/stores.json`, rayons de `config/auchan-categories.json`). Leclerc, Intermarché et Carrefour bloquent les robots (Datadome) : absents, jamais contournés.
- Sortie : `../prices/<enseigne>/<magasin>.json` + `../prices/index.json` (dossier gitignoré sur `main`, publié sur `gh-pages` par `.github/workflows/scrape.yml`).

```bash
cd scraper
npm install
npm run typecheck && npm test
npm run lidl -- --max 20     # essai rapide (20 pages)
npx tsx src/run.ts auchan --max 1   # essai rapide (1 page par rayon et par magasin)
npm run all                  # tous les robots → ../prices
```

## Ajouter un code postal (un testeur de plus)

Dans `config/stores.json`, ajouter le code à `auchan.postalCodes`. À chaque exécution, le robot géocode chaque code (Base Adresse Nationale, service public sans clé), demande à auchan.fr les points de retrait autour de la commune et retient le plus proche de chaque type (`kinds` : `DRIVE` = drive d'hypermarché, `PICKUP_POINT` = click & collect de supermarché) à moins de `maxDistanceKm`. Deux codes servis par le même magasin ne le relèvent qu'une fois ; le fichier porte `serves` (codes desservis + distance) et l'app préfère ces magasins au repli par département. Compter ~4 min par magasin (une requête par seconde) : au-delà de 8 magasins, relever le délai du workflow.

Règle de crédibilité (CLAUDE.md § 2) : un produit qui n'est pas rattaché sans ambiguïté à un ingrédient **n'est pas relevé** ; chaque relevé porte l'enseigne, le magasin ou la portée, la source (`store` = en rayon, `drive`, `site`), la date et la période de validité.
