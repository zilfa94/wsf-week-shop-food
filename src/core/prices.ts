/**
 * Prix réels par magasin (flux du scraper) appliqués à la liste de courses.
 * Règle de crédibilité (CLAUDE.md § 2) : on n'invente ni n'estime jamais un prix. Un article sans relevé
 * valide reste « non couvert » ; chaque devis porte l'enseigne, le magasin, la source et la date du relevé.
 */
import { addDays } from './date';
import type { Ingredient, IngredientId, ISODate, PriceEntry, PriceFile, ShoppingItem, ShoppingList } from './types';

/** Un relevé de plus de 4 jours est affiché comme « ancien » (le cron est quotidien). */
export const PRICE_MAX_AGE_DAYS = 4;

export interface QuoteLine {
  readonly ingredientId: IngredientId;
  readonly entry: PriceEntry;
  /** Conditionnements du magasin à prendre pour couvrir `toBuyExact`. */
  readonly packs: number;
  /** `packs × entry.price`. */
  readonly total: number;
  /** Prix indicatif de l'app pour le même article (pour montrer l'écart, jamais pour combler un trou). */
  readonly indicative: number;
}

export interface StoreQuote {
  readonly retailer: string;
  readonly storeId: string;
  readonly storeName: string;
  readonly postalCode: string;
  /** Distance depuis la commune de l'utilisateur, quand le robot a choisi ce magasin pour son code postal. */
  readonly distanceKm?: number;
  readonly source: PriceFile['source'];
  readonly scrapedAt: string;
  readonly lines: readonly QuoteLine[];
  /** Somme des lignes couvertes. */
  readonly total: number;
  /** Somme des prix indicatifs des mêmes articles. */
  readonly indicativeTotal: number;
  readonly coveredCount: number;
  /** Articles à acheter sans relevé exploitable dans ce magasin. */
  readonly uncovered: readonly IngredientId[];
  /** Part des articles couverts (0..1). */
  readonly coverage: number;
}

/** Grammes par pièce : `conversions.piece` (ingrédient en g) ou l'inverse de `conversions.g` (ingrédient à la pièce). */
function gramsPerPiece(ingredient: Ingredient): number | undefined {
  if (ingredient.canonicalUnit === 'piece') {
    const g = ingredient.conversions.g;
    return g && g > 0 ? 1 / g : undefined;
  }
  return ingredient.conversions.piece;
}

/** Prix par unité canonique de l'ingrédient (€/g, €/ml ou €/pièce), ou `null` si la conversion n'est pas connue. */
export function unitPriceCanonical(entry: PriceEntry, ingredient: Ingredient): number | null {
  const perPiece = gramsPerPiece(ingredient);
  switch (ingredient.canonicalUnit) {
    case 'g':
      if (entry.unit === 'kg') return entry.unitPrice / 1000;
      if (entry.unit === 'piece') return perPiece ? entry.unitPrice / perPiece : null;
      return null;
    case 'ml':
      if (entry.unit === 'l') return entry.unitPrice / 1000;
      return null;
    case 'piece':
      if (entry.unit === 'piece') return entry.unitPrice;
      if (entry.unit === 'kg') return perPiece ? (entry.unitPrice / 1000) * perPiece : null;
      return null;
  }
}

/** Contenu d'un conditionnement du magasin en unité canonique de l'ingrédient, ou `null`. */
export function packSizeCanonical(entry: PriceEntry, ingredient: Ingredient): number | null {
  const perPiece = gramsPerPiece(ingredient);
  switch (ingredient.canonicalUnit) {
    case 'g':
      if (entry.unit === 'kg') return entry.packSize * 1000;
      if (entry.unit === 'piece') return perPiece ? entry.packSize * perPiece : null;
      return null;
    case 'ml':
      return entry.unit === 'l' ? entry.packSize * 1000 : null;
    case 'piece':
      if (entry.unit === 'piece') return entry.packSize;
      if (entry.unit === 'kg') return perPiece ? (entry.packSize * 1000) / perPiece : null;
      return null;
  }
}

/** Le relevé est-il valable pour une semaine de courses commençant à `weekStart` ? */
export function isEntryValid(entry: PriceEntry, weekStart: ISODate): boolean {
  const weekEnd = addDays(weekStart, 6);
  if (entry.validFrom && entry.validFrom > weekEnd) return false;
  if (entry.validUntil && entry.validUntil < weekStart) return false;
  return true;
}

/** Nombre de jours écoulés depuis le relevé (entier ≥ 0). */
export function priceAgeDays(scrapedAt: string, today: ISODate): number {
  const scraped = Date.parse(scrapedAt);
  const now = Date.parse(`${today}T12:00:00Z`);
  if (Number.isNaN(scraped) || Number.isNaN(now)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now - scraped) / 86_400_000));
}

/** Meilleure ligne pour un article : le total le plus bas pour couvrir le besoin, puis le prix unitaire le plus bas. */
export function bestLine(item: ShoppingItem, entries: readonly PriceEntry[], ingredient: Ingredient, weekStart: ISODate): QuoteLine | null {
  let best: QuoteLine | null = null;
  for (const entry of entries) {
    if (entry.ingredientId !== item.ingredientId || !isEntryValid(entry, weekStart)) continue;
    const size = packSizeCanonical(entry, ingredient);
    if (size === null || !(size > 0) || !(entry.price > 0)) continue;
    const packs = Math.max(1, Math.ceil(item.toBuyExact / size - 1e-9));
    const total = Math.round(packs * entry.price * 100) / 100;
    if (!best || total < best.total || (total === best.total && entry.unitPrice < best.entry.unitPrice)) {
      best = { ingredientId: item.ingredientId, entry, packs, total, indicative: item.price };
    }
  }
  return best;
}

/** Devis d'un magasin pour les articles à acheter de la liste. */
export function quoteStore(list: ShoppingList, file: PriceFile, ingredients: ReadonlyMap<IngredientId, Ingredient>, weekStart: ISODate): StoreQuote {
  const toBuy = list.items.filter((i) => i.packs > 0);
  const lines: QuoteLine[] = [];
  const uncovered: IngredientId[] = [];
  for (const item of toBuy) {
    const ingredient = ingredients.get(item.ingredientId);
    const line = ingredient ? bestLine(item, file.prices, ingredient, weekStart) : null;
    if (line) lines.push(line);
    else uncovered.push(item.ingredientId);
  }
  const total = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
  const indicativeTotal = Math.round(lines.reduce((s, l) => s + l.indicative, 0) * 100) / 100;
  return {
    retailer: file.retailer,
    storeId: file.storeId,
    storeName: file.storeName,
    postalCode: file.postalCode,
    source: file.source,
    scrapedAt: file.scrapedAt,
    lines,
    total,
    indicativeTotal,
    coveredCount: lines.length,
    uncovered,
    coverage: toBuy.length === 0 ? 0 : lines.length / toBuy.length,
  };
}

/** Descripteur commun aux fichiers de prix et aux entrées d'index pour le rattachement géographique. */
export type PriceScope = Pick<PriceFile, 'retailer' | 'postalCode' | 'serves'>;

/** Distance du magasin quand le robot l'a choisi comme le plus proche pour ce code postal ; sinon `undefined`. */
export function servedDistanceKm(file: PriceScope, postalCode: string): number | undefined {
  return file.serves?.find((s) => s.postalCode === postalCode)?.distanceKm;
}

/**
 * Un fichier concerne l'utilisateur s'il est national, s'il dessert son code postal (magasin le plus proche
 * choisi par le robot) ou, en repli, s'il est dans son département.
 */
export function fileMatchesPostalCode(file: PriceScope, postalCode: string): boolean {
  if (!file.postalCode) return true;
  if (!postalCode) return false;
  if (servedDistanceKm(file, postalCode) !== undefined) return true;
  return file.postalCode === postalCode || file.postalCode.slice(0, 2) === postalCode.slice(0, 2);
}

/**
 * Fichiers à retenir pour un code postal : pour une enseigne qui a des magasins desservant explicitement
 * ce code postal, seuls ceux-là ; sinon le repli par département. Les fichiers nationaux sont toujours gardés.
 */
export function selectFilesForPostalCode<T extends PriceScope>(files: readonly T[], postalCode: string): T[] {
  const matching = files.filter((f) => fileMatchesPostalCode(f, postalCode));
  const retailersServed = new Set(matching.filter((f) => servedDistanceKm(f, postalCode) !== undefined).map((f) => f.retailer));
  return matching.filter((f) => !f.postalCode || !retailersServed.has(f.retailer) || servedDistanceKm(f, postalCode) !== undefined);
}

/**
 * Devis de tous les magasins pertinents, triés : couverture décroissante puis total croissant.
 * Les magasins sans aucun article couvert sont écartés (rien d'honnête à afficher).
 */
export function compareStores(
  list: ShoppingList,
  files: readonly PriceFile[],
  ingredients: ReadonlyMap<IngredientId, Ingredient>,
  postalCode: string,
  weekStart: ISODate,
): StoreQuote[] {
  return selectFilesForPostalCode(files, postalCode)
    .map((f) => ({ ...quoteStore(list, f, ingredients, weekStart), distanceKm: servedDistanceKm(f, postalCode) }))
    .filter((q) => q.coveredCount > 0)
    .sort((a, b) => b.coverage - a.coverage || a.total - b.total || a.storeName.localeCompare(b.storeName));
}

/** Libellé français de la source pour l'affichage (« prix drive », « offres en supermarché »). */
export function sourceLabel(source: PriceFile['source']): string {
  switch (source) {
    case 'store':
      return 'offres en supermarché';
    case 'drive':
      return 'prix drive';
    case 'site':
      return 'prix du site';
  }
}
