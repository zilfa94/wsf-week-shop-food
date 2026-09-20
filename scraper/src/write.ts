/** Écriture des fichiers publiés : prices/<enseigne>/<magasin>.json et prices/index.json. */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { PriceFile, PriceIndex, PriceIndexEntry } from './types.ts';
import { SCRAPER_VERSION } from './types.ts';

export function writePriceFile(outDir: string, file: PriceFile): string {
  const dir = join(outDir, file.retailer);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${file.storeId}.json`);
  writeFileSync(path, JSON.stringify(file, null, 1) + '\n', 'utf8');
  return path;
}

function listJson(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listJson(p));
    else if (name.endsWith('.json') && name !== 'index.json') out.push(p);
  }
  return out;
}

/** Reconstruit l'index à partir de tous les fichiers présents (les relevés des jours précédents restent listés). */
export function writeIndex(outDir: string, now: Date = new Date()): PriceIndex {
  mkdirSync(outDir, { recursive: true });
  const files: PriceIndexEntry[] = [];
  for (const path of listJson(outDir)) {
    const file = JSON.parse(readFileSync(path, 'utf8')) as PriceFile;
    files.push({
      retailer: file.retailer,
      storeId: file.storeId,
      storeName: file.storeName,
      postalCode: file.postalCode,
      ...(file.serves ? { serves: file.serves } : {}),
      source: file.source,
      scrapedAt: file.scrapedAt,
      path: relative(outDir, path).replace(/\\/g, '/'),
      count: file.prices.length,
      ingredients: new Set(file.prices.map((p) => p.ingredientId)).size,
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const index: PriceIndex = { generatedAt: now.toISOString(), scraperVersion: SCRAPER_VERSION, files };
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1) + '\n', 'utf8');
  return index;
}
