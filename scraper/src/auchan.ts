/**
 * Robot Auchan — prix drive du magasin choisi par code postal (config/stores.json).
 *
 * 1. `POST /journey/update` sélectionne le drive (formulaire à clés pointées) et renvoie un « journey » ;
 *    son id se renvoie ensuite en cookie `lark-journey` (c'est le JS du site qui pose ce cookie, pas le serveur).
 * 2. `robots.txt` interdit `/recherche*` : on parcourt les **pages de rayon** (config/auchan-categories.json),
 *    autorisées, paginées par `?page=N`. Chaque carte `<article itemtype=schema.org/Product>` est rendue côté serveur.
 * 3. Rattachement aux ingrédients par les règles communes (match.ts) ; rien n'est deviné.
 */
import { fetchBytes, fetchText, USER_AGENT } from './http.ts';
import { matchIngredients } from './match.ts';
import type { PriceEntry, PriceFile, RulesConfig } from './types.ts';
import { SCRAPER_VERSION } from './types.ts';
import { parsePack, parseUnitPrice, round2 } from './units.ts';

const ORIGIN = 'https://www.auchan.fr';

export interface AuchanStore {
  storeId: string;
  storeName: string;
  postalCode: string;
  sellerId: string;
  storeReference: string;
  search: { zipcode: string; city: string; latitude: number; longitude: number };
}

export interface AuchanOptions {
  rules: RulesConfig;
  store: AuchanStore;
  categories: readonly string[];
  maxPages?: number;
  now?: Date;
  log?: (msg: string) => void;
}

export interface AuchanCard {
  name: string;
  brand: string;
  url: string;
  price: number;
  packLabel: string;
  unitPriceText: string;
  inStock: boolean;
  promo: boolean;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');

const text = (html: string): string => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Extrait les cartes produit d'une page de rayon (HTML rendu côté serveur). */
export function parseCards(html: string): AuchanCard[] {
  const cards: AuchanCard[] = [];
  const re = /<article[^>]*itemtype="http:\/\/schema\.org\/Product"[\s\S]*?<\/article>/g;
  for (const m of html.matchAll(re)) {
    const a = m[0];
    const href = a.match(/class="product-thumbnail__details-wrapper[^"]*"[^>]*href="([^"]+)"/)?.[1] ?? a.match(/href="(\/[^"]*\/pr-[^"]+)"/)?.[1];
    const desc = a.match(/<p class="product-thumbnail__description"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    const brand = desc?.match(/<strong itemprop="brand">([\s\S]*?)<\/strong>/)?.[1];
    const priceMeta = a.match(/<meta itemprop="price" content="([\d.]+)"/)?.[1];
    if (!href || !desc || !priceMeta) continue;
    const packLabel = a.match(/class="product-attribute"[^>]*aria-label="Contenance : ([^"]+)"/)?.[1] ?? '';
    const unitPriceText = a.match(/>\s*([\d\s]+,\d{2}\s*(?:&#x20AC;|€)\s*\/\s*(?:kg|L|l|pi[eè]ce|u)[^<]*)</i)?.[1] ?? '';
    cards.push({
      name: text(desc),
      brand: brand ? text(brand) : '',
      url: href.startsWith('http') ? href : ORIGIN + href,
      price: Number(priceMeta),
      packLabel: decodeEntities(packLabel).trim(),
      unitPriceText: decodeEntities(unitPriceText).trim(),
      inStock: !/OutOfStock/.test(a),
      promo: /product-discount-label/.test(a),
    });
  }
  return cards;
}

/** Convertit une carte en relevés (un par ingrédient rattaché). */
export function entriesFromCard(card: AuchanCard, rules: RulesConfig): PriceEntry[] {
  if (!card.inStock || !(card.price > 0)) return [];
  const pack = card.packLabel ? parsePack(card.packLabel) : null;
  const base = card.unitPriceText ? parseUnitPrice(card.unitPriceText.replace(/\s*\/\s*(kg|l)\b/i, ' /$1')) : null;
  const ids = matchIngredients(card.name, rules);
  const out: PriceEntry[] = [];
  for (const ingredientId of ids) {
    const rule = rules.rules[ingredientId]!;
    let unit = base?.unit ?? pack?.unit;
    let unitPrice = base?.price;
    let packSize = pack?.size;
    if (pack && base && pack.unit !== base.unit) packSize = undefined;
    if (unitPrice === undefined && pack && pack.size > 0) unitPrice = card.price / pack.size;
    if (packSize === undefined && unitPrice !== undefined && unitPrice > 0) packSize = card.price / unitPrice;
    if (!unit || unitPrice === undefined || packSize === undefined || (rule.unit && unit !== rule.unit)) continue;
    const entry: PriceEntry = {
      ingredientId,
      productName: card.name,
      price: round2(card.price),
      unitPrice: round2(unitPrice),
      unit,
      packSize: Math.round(packSize * 1000) / 1000,
      packLabel: card.packLabel || card.unitPriceText,
      url: card.url,
    };
    if (card.promo) entry.promo = true;
    out.push(entry);
  }
  return out;
}

/** Sélectionne le drive et renvoie l'id de journey à renvoyer en cookie. */
export async function selectStore(store: AuchanStore): Promise<string> {
  const body = new URLSearchParams({
    'offeringContext.seller.id': store.sellerId,
    'offeringContext.channels[0]': 'PICK_UP',
    'offeringContext.storeReference': store.storeReference,
    'offeringContext.availableInLark': 'true',
    'address.zipcode': store.search.zipcode,
    'address.city': store.search.city,
    'address.country': 'France',
    'location.latitude': String(store.search.latitude),
    'location.longitude': String(store.search.longitude),
    accuracy: 'MUNICIPALITY',
  });
  const res = await fetch(`${ORIGIN}/journey/update`, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  });
  if (!res.ok) throw new Error(`Auchan journey/update : HTTP ${res.status}`);
  const journey = (await res.json()) as { id?: unknown; activeContexts?: { type?: string; context?: { seller?: { storeReference?: { id?: string } } } | null }[] };
  const chosen = journey.activeContexts?.find((c) => c.type === 'GROCERY')?.context?.seller?.storeReference?.id;
  if (typeof journey.id !== 'string' || chosen !== store.storeReference) {
    throw new Error(`Auchan : magasin ${store.storeReference} non retenu (journey ${String(journey.id)}, retenu ${String(chosen)})`);
  }
  return journey.id;
}

export async function scrapeAuchan(opts: AuchanOptions): Promise<PriceFile> {
  const log = opts.log ?? (() => {});
  const now = opts.now ?? new Date();
  const maxPages = opts.maxPages ?? 4;
  const journeyId = await selectStore(opts.store);
  log(`Auchan : ${opts.store.storeName} sélectionné (journey ${journeyId.slice(0, 8)}…)`);
  const headers = { Cookie: `lark-journey=${journeyId}` };

  const prices: PriceEntry[] = [];
  const seen = new Set<string>();
  let pages = 0;
  for (const category of opts.categories) {
    for (let page = 1; page <= maxPages; page++) {
      const url = `${ORIGIN}${category}${page > 1 ? `?page=${page}` : ''}`;
      let html: string | null;
      try {
        html = await fetchText(url, { headers });
      } catch (err) {
        log(`  ! ${url} : ${(err as Error).message}`);
        break;
      }
      if (!html) break;
      pages++;
      const cards = parseCards(html);
      if (cards.length === 0) break;
      let kept = 0;
      for (const card of cards) {
        for (const entry of entriesFromCard(card, opts.rules)) {
          const key = `${entry.ingredientId}|${entry.url}`;
          if (seen.has(key)) continue;
          seen.add(key);
          prices.push(entry);
          kept++;
        }
      }
      log(`  ${category.split('/').slice(-2, -1)[0]} p${page} : ${cards.length} produits, ${kept} relevés`);
      // Dernière page atteinte quand le lien vers la suivante manque.
      if (!html.includes(`?page=${page + 1}"`)) break;
    }
  }
  log(`Auchan : ${pages} pages, ${prices.length} relevés`);

  return {
    retailer: 'auchan',
    storeId: opts.store.storeId,
    storeName: opts.store.storeName,
    postalCode: opts.store.postalCode,
    source: 'drive',
    scrapedAt: now.toISOString(),
    scraperVersion: SCRAPER_VERSION,
    prices,
  };
}

/** Réservé aux tests : lecture brute d'une page de rayon. */
export async function fetchCategoryPage(path: string, journeyId: string): Promise<string | null> {
  const bytes = await fetchBytes(`${ORIGIN}${path}`, { headers: { Cookie: `lark-journey=${journeyId}` } });
  return bytes ? new TextDecoder().decode(bytes) : null;
}
