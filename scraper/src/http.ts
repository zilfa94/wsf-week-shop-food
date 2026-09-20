/**
 * Accès HTTP poli : agent identifié, une requête par seconde au plus, quelques tentatives.
 * Les enseignes doivent pouvoir nous identifier et nous contacter (dépôt public).
 */
import { gunzipSync } from 'node:zlib';

export const USER_AGENT = 'WSF-WeekShopFood-Bot/0.1 (+https://github.com/zilfa94/wsf-week-shop-food)';

const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

export interface FetchOptions {
  attempts?: number;
  headers?: Record<string, string>;
}

/** Récupère un corps binaire ; renvoie `null` sur 404 (produit retiré), lève sur les autres échecs répétés. */
export async function fetchBytes(url: string, opts: FetchOptions = {}): Promise<Uint8Array | null> {
  const attempts = opts.attempts ?? 3;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    await throttle();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9', ...opts.headers } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} ${url}`);
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      await sleep(1500 * (i + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Échec ${url}`);
}

export async function fetchText(url: string, opts?: FetchOptions): Promise<string | null> {
  const bytes = await fetchBytes(url, opts);
  return bytes ? new TextDecoder('utf-8').decode(bytes) : null;
}

/** Corps texte, décompressé si le serveur renvoie un gzip brut (sitemaps `.xml.gz`). */
export async function fetchTextMaybeGzip(url: string, opts?: FetchOptions): Promise<string | null> {
  const bytes = await fetchBytes(url, opts);
  if (!bytes) return null;
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return new TextDecoder('utf-8').decode(isGzip ? gunzipSync(bytes) : bytes);
}
