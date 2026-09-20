/**
 * Robot Lidl — prix « en supermarché » (offres de la semaine, portée nationale).
 *
 * Lidl ne publie pas en ligne son assortiment permanent : lidl.fr expose seulement les
 * offres en supermarché avec leur période de validité. Le robots.txt de lidl.fr interdit
 * la recherche (`*search?q=*`) mais fournit un sitemap produits : on part de ce sitemap,
 * on ne visite que les pages dont le slug peut correspondre à un de nos ingrédients, et on
 * lit les données produit rendues côté serveur (`__NUXT_DATA__`).
 */
import { collectObjects, unflatten } from './devalue.ts';
import { fetchText, fetchTextMaybeGzip } from './http.ts';
import { couldMatchAny, matchIngredients } from './match.ts';
import type { PriceEntry, PriceFile, RulesConfig } from './types.ts';
import { SCRAPER_VERSION } from './types.ts';
import { parsePack, parseUnitPrice, round2 } from './units.ts';

const SITEMAP_URL = 'https://www.lidl.fr/p/export/FR/fr/product_sitemap.xml.gz';
const ORIGIN = 'https://www.lidl.fr';
/** Une offre est retenue si sa fenêtre chevauche [aujourd'hui, aujourd'hui + 7 j]. */
const HORIZON_DAYS = 7;

export interface LidlOptions {
  rules: RulesConfig;
  now?: Date;
  /** Plafond de pages visitées (sécurité). */
  maxPages?: number;
  log?: (msg: string) => void;
}

interface LidlProduct {
  fullTitle?: unknown;
  category?: unknown;
  canonicalUrl?: unknown;
  price?: { price?: unknown; packaging?: { text?: unknown }; basePrice?: { text?: unknown }; oldPrice?: unknown; discount?: unknown } | undefined;
  stockAvailability?: { badgeInfoV2?: unknown } | undefined;
  storeStartDate?: unknown;
  storeEndDate?: unknown;
}

interface Window {
  from: number;
  until: number | undefined;
}

export function slugOf(url: string): string | null {
  const m = url.match(/\/p\/([^/]+)\/p\d+$/);
  return m ? m[1]!.replace(/-/g, ' ') : null;
}

export function extractNuxtData(html: string): unknown[] | null {
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const parsed: unknown = JSON.parse(m[1]!);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Fenêtres de validité annoncées (« 17.09. - 23.09. | En supermarché »), en secondes Unix. */
export function validityWindows(p: LidlProduct): Window[] {
  const out: Window[] = [];
  const badges = p.stockAvailability?.badgeInfoV2;
  if (Array.isArray(badges)) {
    for (const b of badges) {
      if (b && typeof b === 'object' && typeof (b as { validFrom?: unknown }).validFrom === 'number') {
        const w = b as { validFrom: number; validUntil?: unknown };
        out.push({ from: w.validFrom, until: typeof w.validUntil === 'number' ? w.validUntil : undefined });
      }
    }
  }
  if (out.length === 0 && typeof p.storeStartDate === 'number') {
    out.push({ from: p.storeStartDate, until: typeof p.storeEndDate === 'number' ? p.storeEndDate : undefined });
  }
  return out;
}

export function currentWindow(windows: Window[], now: Date): Window | null {
  const t = Math.floor(now.getTime() / 1000);
  const horizon = t + HORIZON_DAYS * 86400;
  const live = windows.filter((w) => w.from <= horizon && (w.until === undefined || w.until >= t));
  live.sort((a, b) => a.from - b.from);
  return live[0] ?? null;
}

/** Date civile en France (les bornes Lidl sont des minuits Europe/Paris). */
const iso = (sec: number): string => new Date(sec * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** Convertit une page produit en relevés (un par ingrédient rattaché) ; `[]` si rien de crédible. */
export function entriesFromProduct(p: LidlProduct, rules: RulesConfig, now: Date): PriceEntry[] {
  const title = typeof p.fullTitle === 'string' ? p.fullTitle.trim() : '';
  const category = typeof p.category === 'string' ? p.category : '';
  const price = p.price?.price;
  if (!title || typeof price !== 'number' || !(price > 0)) return [];
  if (!/^(Food|F\+V)\b/.test(category)) return [];
  const window = currentWindow(validityWindows(p), now);
  if (!window) return [];

  const packLabel = typeof p.price?.packaging?.text === 'string' ? p.price.packaging.text.trim() : '';
  const baseText = typeof p.price?.basePrice?.text === 'string' ? p.price.basePrice.text : '';
  const pack = packLabel ? parsePack(packLabel) : null;
  const base = baseText ? parseUnitPrice(baseText) : null;

  const ids = matchIngredients(title, rules);
  const entries: PriceEntry[] = [];
  for (const ingredientId of ids) {
    const rule = rules.rules[ingredientId]!;
    let unit = base?.unit ?? pack?.unit;
    let unitPrice = base?.price;
    let packSize = pack?.size;
    if (pack && base && pack.unit !== base.unit) {
      // Prix de base et conditionnement incohérents : on garde le prix de base officiel.
      packSize = undefined;
    }
    if (unitPrice === undefined && pack && pack.size > 0) unitPrice = price / pack.size;
    if (packSize === undefined && unitPrice !== undefined && unitPrice > 0) packSize = price / unitPrice;
    if (!unit || unitPrice === undefined || packSize === undefined || (rule.unit && unit !== rule.unit)) continue;
    const url = typeof p.canonicalUrl === 'string' ? ORIGIN + p.canonicalUrl : '';
    const entry: PriceEntry = {
      ingredientId,
      productName: title,
      price: round2(price),
      unitPrice: round2(unitPrice),
      unit,
      packSize: Math.round(packSize * 1000) / 1000,
      packLabel: packLabel || baseText,
      url,
      validFrom: iso(window.from),
      promo: true,
    };
    if (window.until !== undefined) entry.validUntil = iso(window.until);
    entries.push(entry);
  }
  return entries;
}

/**
 * Sur la page produit, Nuxt sérialise les données en plusieurs objets (textes, produit,
 * prix, disponibilité) ; on les réassemble dans la forme du gridbox de recherche.
 */
export function parseProductPage(html: string): LidlProduct | null {
  const data = extractNuxtData(html);
  if (!data) return null;
  const root = unflatten(data);
  const first = (pred: (o: Record<string, unknown>) => boolean): Record<string, unknown> | undefined => collectObjects(root, pred)[0];

  const texts = first((o) => typeof o.fullTitle === 'string');
  const product = first((o) => typeof o.category === 'string' && typeof o.canonicalUrl === 'string');
  const prices = collectObjects(root, (o) => typeof o.price === 'number' && typeof o.packaging === 'object');
  // Plusieurs blocs prix possibles (prix courant, offre datée) : on privilégie celui qui porte une période.
  const price = prices.find((o) => typeof o.startDate === 'string') ?? prices[0];
  const stock = first((o) => Array.isArray(o.badgeInfoV2));
  const store = first((o) => typeof o.storeStartDate === 'number');
  if (!texts || !product || !price) return null;

  return {
    fullTitle: texts.fullTitle,
    category: product.category,
    canonicalUrl: product.canonicalUrl,
    price: price as LidlProduct['price'],
    stockAvailability: (stock ?? {}) as LidlProduct['stockAvailability'],
    storeStartDate: store?.storeStartDate,
    storeEndDate: store?.storeEndDate,
  };
}

export async function scrapeLidl(opts: LidlOptions): Promise<PriceFile> {
  const log = opts.log ?? (() => {});
  const now = opts.now ?? new Date();
  const maxPages = opts.maxPages ?? 400;

  const xml = await fetchTextMaybeGzip(SITEMAP_URL);
  if (!xml) throw new Error('Sitemap Lidl introuvable');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  const candidates = urls.filter((u) => {
    const slug = slugOf(u);
    return slug !== null && couldMatchAny(slug, opts.rules);
  });
  log(`Lidl : ${urls.length} produits au sitemap, ${candidates.length} pages candidates`);

  const prices: PriceEntry[] = [];
  let visited = 0;
  for (const url of candidates.slice(0, maxPages)) {
    visited++;
    let html: string | null = null;
    try {
      html = await fetchText(url);
    } catch (err) {
      log(`  ! ${url} : ${(err as Error).message}`);
      continue;
    }
    if (!html) continue;
    const product = parseProductPage(html);
    if (!product) continue;
    // Le sitemap liste parfois deux URL pour la même fiche : on ne garde qu'un relevé par produit et ingrédient.
    const entries = entriesFromProduct(product, opts.rules, now).filter((e) => !prices.some((p) => p.ingredientId === e.ingredientId && p.productName === e.productName && p.price === e.price && p.packLabel === e.packLabel));
    if (entries.length > 0) log(`  ✓ ${entries[0]!.productName} → ${entries.map((e) => e.ingredientId).join(', ')} (${entries[0]!.price} €)`);
    prices.push(...entries);
  }
  log(`Lidl : ${visited} pages visitées, ${prices.length} relevés`);

  return {
    retailer: 'lidl',
    storeId: 'national',
    storeName: 'Lidl — offres en supermarché (France entière)',
    postalCode: '',
    source: 'store',
    scrapedAt: now.toISOString(),
    scraperVersion: SCRAPER_VERSION,
    prices,
  };
}
