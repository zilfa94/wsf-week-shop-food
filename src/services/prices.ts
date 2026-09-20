/**
 * Flux des prix réels : téléchargement de `prices/index.json` puis des seuls fichiers de magasins qui
 * concernent le code postal de l'utilisateur, cache AsyncStorage horodaté (hors-ligne = dernier cache),
 * état exposé par un petit store zustand séparé du store principal (rien de tout cela n'est persisté
 * avec le profil ou le plan). Aucun prix n'est fabriqué ici : on ne fait que transporter les fichiers du scraper.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { selectFilesForPostalCode } from '@/core/prices';
import type { PriceFile, PriceIndex } from '@/core/types';

/** GitHub Pages (branche gh-pages), puis repli sur le contenu brut de la branche si Pages n'est pas activé. */
export const PRICE_BASE_URLS: readonly string[] = [
  'https://zilfa94.github.io/wsf-week-shop-food/prices/',
  'https://raw.githubusercontent.com/zilfa94/wsf-week-shop-food/gh-pages/prices/',
];

const CACHE_KEY = 'wsf.prices.v2';
/** Au-delà, on retélécharge silencieusement à l'ouverture de l'écran (le cron est quotidien). */
const REFRESH_AFTER_MS = 6 * 3_600_000;
const TIMEOUT_MS = 12_000;

export interface PriceCache {
  readonly fetchedAt: string;
  readonly baseUrl: string;
  /** Code postal pour lequel les fichiers ont été choisis ; `''` = fichiers nationaux seulement. */
  readonly postalCode: string;
  readonly index: PriceIndex;
  readonly files: readonly PriceFile[];
}

export interface PriceState {
  readonly cache: PriceCache | null;
  readonly loading: boolean;
  /** Dernière erreur réseau, en français ; `null` si la dernière tentative a réussi. */
  readonly error: string | null;
  readonly hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Télécharge si le cache est absent, ancien ou fait pour un autre code postal (`force` = toujours). Ne lève jamais. */
  refresh: (postalCode: string, force?: boolean) => Promise<void>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function isPriceFile(v: unknown): v is PriceFile {
  return typeof v === 'object' && v !== null && typeof (v as PriceFile).retailer === 'string' && Array.isArray((v as PriceFile).prices);
}

/**
 * Télécharge l'index puis les fichiers qui concernent `postalCode` (nationaux, magasins desservant ce code,
 * repli département) ; essaie les bases dans l'ordre. Lève si aucune base ne répond.
 */
export async function downloadPrices(postalCode: string, now: Date = new Date()): Promise<PriceCache> {
  let lastError: unknown;
  for (const baseUrl of PRICE_BASE_URLS) {
    try {
      const index = await fetchJson<PriceIndex>(`${baseUrl}index.json`);
      if (!Array.isArray(index.files)) throw new Error('index invalide');
      const files: PriceFile[] = [];
      for (const entry of selectFilesForPostalCode(index.files, postalCode)) {
        const file = await fetchJson<unknown>(`${baseUrl}${entry.path}`);
        if (isPriceFile(file)) files.push(file);
      }
      return { fetchedAt: now.toISOString(), baseUrl, postalCode, index, files };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Flux des prix injoignable');
}

export async function readPriceCache(): Promise<PriceCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PriceCache;
    return Array.isArray(parsed.files) && parsed.index && typeof parsed.postalCode === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writePriceCache(cache: PriceCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache facultatif : l'écran fonctionne avec l'état en mémoire.
  }
}

export function isCacheStale(cache: PriceCache | null, postalCode: string, now: Date = new Date()): boolean {
  if (!cache || cache.postalCode !== postalCode) return true;
  const t = Date.parse(cache.fetchedAt);
  return Number.isNaN(t) || now.getTime() - t > REFRESH_AFTER_MS;
}

export const usePriceStore = create<PriceState>()((set, get) => ({
  cache: null,
  loading: false,
  error: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const cache = await readPriceCache();
    set({ cache, hydrated: true });
  },
  refresh: async (postalCode, force = false) => {
    const { loading, cache } = get();
    if (loading) return;
    if (!force && !isCacheStale(cache, postalCode)) return;
    set({ loading: true });
    try {
      const fresh = await downloadPrices(postalCode);
      await writePriceCache(fresh);
      set({ cache: fresh, error: null, loading: false });
    } catch (err) {
      set({ error: err instanceof Error && /HTTP 404/.test(err.message) ? 'Flux des prix pas encore publié.' : 'Prix indisponibles hors connexion.', loading: false });
    }
  },
}));
