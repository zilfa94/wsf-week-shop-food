# scraper/ — relevé des prix réels

Projet Node séparé de l'app (aucune dépendance ici n'entre dans le bundle Expo). Il produit des fichiers JSON statiques que l'app télécharge.

- Contrat des fichiers : `src/types.ts` (`PriceFile`, `PriceEntry`, `PriceIndex`).
- Règles de rattachement produit → ingrédient : `config/ingredients.json` (une règle par ingrédient de `src/data/ingredients.ts`).
- Robots : `src/lidl.ts` (offres en supermarché, portée nationale). À venir : Leclerc, Auchan (drive, magasin par code postal).
- Sortie : `../prices/<enseigne>/<magasin>.json` + `../prices/index.json` (dossier gitignoré sur `main`, publié sur `gh-pages` par `.github/workflows/scrape.yml`).

```bash
cd scraper
npm install
npm run typecheck && npm test
npm run lidl -- --max 20     # essai rapide (20 pages)
npm run all                  # tous les robots → ../prices
```

Règle de crédibilité (CLAUDE.md § 2) : un produit qui n'est pas rattaché sans ambiguïté à un ingrédient **n'est pas relevé** ; chaque relevé porte l'enseigne, le magasin ou la portée, la source (`store` = en rayon, `drive`, `site`), la date et la période de validité.
