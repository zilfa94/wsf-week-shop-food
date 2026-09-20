/**
 * Contrat des fichiers de prix publiés (prices/<enseigne>/<magasin>.json + prices/index.json).
 * Règle de crédibilité (CLAUDE.md § 2) : aucun prix inventé ; chaque relevé porte son enseigne,
 * son magasin ou sa portée, sa source et sa date. L'app lit ces fichiers tels quels.
 */

export type Retailer = 'lidl' | 'leclerc' | 'auchan' | 'intermarche' | 'carrefour';

/** Où le prix a été observé : en rayon (supermarché), sur le drive d'un magasin ou sur le site marchand. */
export type PriceSource = 'store' | 'drive' | 'site';

/** Unité de référence du prix unitaire. */
export type PriceUnit = 'kg' | 'l' | 'piece';

export interface PriceEntry {
  /** Identifiant d'ingrédient WSF (src/data/ingredients.ts). */
  ingredientId: string;
  /** Libellé exact du produit tel qu'affiché par l'enseigne. */
  productName: string;
  /** Prix TTC affiché pour le conditionnement, en euros. */
  price: number;
  /** Prix ramené à l'unité de référence (€/kg, €/l ou €/pièce). */
  unitPrice: number;
  unit: PriceUnit;
  /** Contenu du conditionnement dans l'unité de référence (0,75 pour « 750 g »). */
  packSize: number;
  /** Texte du conditionnement tel qu'affiché (« 750 g », « 6 x 125 g »). */
  packLabel: string;
  /** Page produit chez l'enseigne. */
  url: string;
  /** Fenêtre de validité annoncée par l'enseigne (offres), dates ISO. */
  validFrom?: string;
  validUntil?: string;
  /** Promotion (prix barré, offre limitée). */
  promo?: boolean;
}

/** Code postal de la configuration pour lequel ce magasin est le plus proche de son type, et à quelle distance. */
export interface ServedPostalCode {
  postalCode: string;
  distanceKm: number;
}

export interface PriceFile {
  retailer: Retailer;
  /** Identifiant stable du magasin, ou `national` quand l'enseigne publie un prix unique. */
  storeId: string;
  /** Nom lisible : « Leclerc Drive Créteil » ou « Lidl — offres en supermarché (France) ». */
  storeName: string;
  /** Code postal du magasin ; vide pour une portée nationale. */
  postalCode: string;
  /** Codes postaux desservis (magasin le plus proche pour chacun) ; absent pour une portée nationale. */
  serves?: ServedPostalCode[];
  source: PriceSource;
  /** Instant du relevé (ISO 8601). */
  scrapedAt: string;
  /** Version du script qui a produit le fichier. */
  scraperVersion: string;
  prices: PriceEntry[];
}

export interface PriceIndexEntry {
  retailer: Retailer;
  storeId: string;
  storeName: string;
  postalCode: string;
  serves?: ServedPostalCode[];
  source: PriceSource;
  scrapedAt: string;
  /** Chemin relatif au dossier `prices/`. */
  path: string;
  /** Nombre de relevés et d'ingrédients couverts. */
  count: number;
  ingredients: number;
}

export interface PriceIndex {
  generatedAt: string;
  scraperVersion: string;
  files: PriceIndexEntry[];
}

/** Règles de rattachement d'un produit à un ingrédient (scraper/config/ingredients.json). */
export interface IngredientRule {
  /** Au moins une de ces expressions doit apparaître dans le libellé normalisé (mots entiers). */
  any: string[];
  /** Aucune de ces expressions ne doit apparaître. */
  not?: string[];
  /** Unité de référence exigée ; sans cette clé, toute unité est acceptée (l'app convertit kg ↔ pièce). */
  unit?: PriceUnit;
}

export interface RulesConfig {
  /** Exclusions communes à tous les ingrédients (plats préparés, non-alimentaire…). */
  globalNot: string[];
  rules: Record<string, IngredientRule>;
}

export const SCRAPER_VERSION = '0.1.0';
