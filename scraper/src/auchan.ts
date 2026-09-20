/**
 * Robot Auchan — prix drive / click & collect des magasins les plus proches des codes postaux configurés
 * (config/stores.json).
 *
 * 0. Chaque code postal est géocodé (geocode.ts) puis `GET /journey/search` liste les points de retrait
 *    autour de la commune, avec leur distance : on retient le plus proche de chaque type demandé
 *    (drive d'hypermarché, click & collect de supermarché), à condition qu'il soit vendu sur auchan.fr.
 * 1. `POST /journey/update` sélectionne le magasin (formulaire à clés pointées) et renvoie un « journey » ;
 *    son id se renvoie ensuite en cookie `lark-journey` (c'est le JS du site qui pose ce cookie, pas le serveur).
 * 2. `robots.txt` interdit `/recherche*` : on parcourt les **pages de rayon** (config/auchan-categories.json),
 *    autorisées, paginées par `?page=N`. Chaque carte `<article itemtype=schema.org/Product>` est rendue côté serveur.
 * 3. Rattachement aux ingrédients par les règles communes (match.ts) ; rien n'est deviné.
 */
import { geocodePostalCode, type Place } from './geocode.ts';
import { fetchBytes, fetchText, USER_AGENT } from './http.ts';
import { matchIngredients } from './match.ts';
import type { PriceEntry, PriceFile, RulesConfig, ServedPostalCode } from './types.ts';
import { SCRAPER_VERSION } from './types.ts';
import { parsePack, parseUnitPrice, round2 } from './units.ts';

const ORIGIN = 'https://www.auchan.fr';

/** Types de points de retrait d'auchan.fr retenus : drive (hypermarché) et click & collect (supermarché). */
export type AuchanKind = 'DRIVE' | 'PICKUP_POINT';
export const AUCHAN_KINDS: readonly AuchanKind[] = ['DRIVE', 'PICKUP_POINT'];

export interface AuchanStore {
  storeId: string;
  storeName: string;
  postalCode: string;
  kind: AuchanKind;
  sellerId: string;
  storeReference: string;
  /** Commune de recherche (celle du premier code postal desservi) à renvoyer au site lors de la sélection. */
  search: Place;
  serves: ServedPostalCode[];
}

/** Bloc `auchan` de config/stores.json. */
export interface AuchanConfig {
  postalCodes: string[];
  kinds?: AuchanKind[];
  /** Au-delà, un code postal n'a pas de magasin de ce type (rien n'est affiché plutôt qu'un magasin lointain). */
  maxDistanceKm?: number;
}

/** Fragment utile d'un `offeringContext` renvoyé par `GET /journey/search`. */
interface OfferingContext {
  seller?: { id?: string; name?: string; type?: string; storeReference?: { id?: string } };
  channels?: string[];
  closed?: boolean;
  pointOfService?: {
    type?: string;
    enabled?: boolean;
    address?: { zipcode?: string; city?: string };
    distance?: { value?: number; unit?: string };
    metadata?: { availableInLark?: string };
  };
}

/** Le point de retrait le plus proche de chaque type demandé, parmi ceux vendus sur auchan.fr. Pur, testé. */
export function nearestStores(contexts: readonly OfferingContext[], place: Place, kinds: readonly AuchanKind[], maxDistanceKm: number): AuchanStore[] {
  const out: AuchanStore[] = [];
  for (const kind of kinds) {
    let best: { ctx: OfferingContext; km: number } | null = null;
    for (const ctx of contexts) {
      const pos = ctx.pointOfService;
      const km = pos?.distance?.value;
      if (
        ctx.seller?.type !== 'GROCERY' ||
        !ctx.channels?.includes('PICK_UP') ||
        ctx.closed === true ||
        pos?.enabled === false ||
        pos?.type !== kind ||
        pos.metadata?.availableInLark !== 'true' ||
        typeof km !== 'number' ||
        km > maxDistanceKm ||
        !ctx.seller.id ||
        !ctx.seller.name ||
        !ctx.seller.storeReference?.id
      ) {
        continue;
      }
      if (!best || km < best.km) best = { ctx, km };
    }
    if (!best) continue;
    const seller = best.ctx.seller!;
    out.push({
      storeId: seller.storeReference!.id!,
      storeName: seller.name!.replace(/\s+/g, ' ').trim(),
      postalCode: best.ctx.pointOfService?.address?.zipcode ?? '',
      kind,
      sellerId: seller.id!,
      storeReference: seller.storeReference!.id!,
      search: place,
      serves: [{ postalCode: place.postalCode, distanceKm: Math.round(best.km * 10) / 10 }],
    });
  }
  return out;
}

/** Liste des points de retrait autour d'une commune (mêmes paramètres que le sélecteur de magasin du site). */
export async function searchStores(place: Place): Promise<OfferingContext[]> {
  const query = new URLSearchParams({
    'address.zipcode': place.postalCode,
    'address.city': place.city,
    'address.country': 'France',
    'location.latitude': String(place.latitude),
    'location.longitude': String(place.longitude),
    accuracy: 'MUNICIPALITY',
    channels: 'PICK_UP',
    sellerType: 'GROCERY',
    hasProductReferences: 'true',
  });
  const body = await fetchText(`${ORIGIN}/journey/search?${query}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
  if (!body) throw new Error('Auchan journey/search : 404');
  const contexts = (JSON.parse(body) as { offeringContexts?: OfferingContext[] }).offeringContexts;
  return Array.isArray(contexts) ? contexts : [];
}

/**
 * Résout les magasins à relever pour la configuration : un magasin desservant plusieurs codes postaux
 * n'est relevé qu'une fois (ses `serves` sont fusionnés). Un code postal introuvable est signalé et ignoré.
 */
export async function resolveAuchanStores(config: AuchanConfig, log: (msg: string) => void = () => {}): Promise<AuchanStore[]> {
  const kinds = config.kinds ?? AUCHAN_KINDS;
  const maxDistanceKm = config.maxDistanceKm ?? 20;
  const byId = new Map<string, AuchanStore>();
  for (const postalCode of config.postalCodes) {
    const place = await geocodePostalCode(postalCode);
    if (!place) {
      log(`Auchan : code postal ${postalCode} introuvable (géocodage)`);
      continue;
    }
    const stores = nearestStores(await searchStores(place), place, kinds, maxDistanceKm);
    if (stores.length === 0) log(`Auchan : aucun point de retrait à moins de ${maxDistanceKm} km de ${place.city} (${postalCode})`);
    for (const store of stores) {
      const existing = byId.get(store.storeId);
      if (existing) existing.serves.push(...store.serves);
      else byId.set(store.storeId, store);
      log(`Auchan : ${postalCode} ${place.city} → ${store.storeName} (${store.postalCode}, ${store.serves[0]!.distanceKm} km)`);
    }
  }
  return [...byId.values()];
}

/** Rayon à parcourir ; `only` restreint les ingrédients relevables (une conserve de carottes n'est pas une carotte fraîche). */
export interface AuchanCategory {
  path: string;
  only?: readonly string[];
}

export interface AuchanOptions {
  rules: RulesConfig;
  store: AuchanStore;
  categories: readonly AuchanCategory[];
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

/** Convertit une carte en relevés (un par ingrédient rattaché, limité à `only` si le rayon en porte une). */
export function entriesFromCard(card: AuchanCard, rules: RulesConfig, only?: readonly string[]): PriceEntry[] {
  if (!card.inStock || !(card.price > 0)) return [];
  const pack = card.packLabel ? parsePack(card.packLabel) : null;
  const base = card.unitPriceText ? parseUnitPrice(card.unitPriceText.replace(/\s*\/\s*(kg|l)\b/i, ' /$1')) : null;
  const ids = matchIngredients(card.name, rules).filter((id) => !only || only.includes(id));
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
    'address.zipcode': store.search.postalCode,
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
      const url = `${ORIGIN}${category.path}${page > 1 ? `?page=${page}` : ''}`;
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
        for (const entry of entriesFromCard(card, opts.rules, category.only)) {
          const key = `${entry.ingredientId}|${entry.url}`;
          if (seen.has(key)) continue;
          seen.add(key);
          prices.push(entry);
          kept++;
        }
      }
      log(`  ${category.path.split('/').slice(-2, -1)[0]} p${page} : ${cards.length} produits, ${kept} relevés`);
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
    serves: opts.store.serves,
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
