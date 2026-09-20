/**
 * Point d'entrée : `tsx src/run.ts <lidl|auchan|all> [--out <dossier>] [--max <pages>]`.
 * Chaque robot écrit son fichier même s'il est partiel ; un robot qui échoue n'empêche pas
 * les autres ni la reconstruction de l'index. Code de sortie 1 si aucun robot n'a abouti.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeAuchan, type AuchanStore } from './auchan.ts';
import { scrapeLidl } from './lidl.ts';
import type { PriceFile, Retailer, RulesConfig } from './types.ts';
import { writeIndex, writePriceFile } from './write.ts';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const target = args[0] ?? 'all';
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const outDir = resolve(here, '..', flag('--out') ?? '../prices');
const maxPages = flag('--max') ? Number(flag('--max')) : undefined;

const rules = JSON.parse(readFileSync(resolve(here, '../config/ingredients.json'), 'utf8')) as RulesConfig;
const stores = JSON.parse(readFileSync(resolve(here, '../config/stores.json'), 'utf8')) as { auchan?: AuchanStore[] };
const auchanCategories = JSON.parse(readFileSync(resolve(here, '../config/auchan-categories.json'), 'utf8')) as { maxPages: number; categories: string[] };
const log = (msg: string): void => console.log(msg);

const robots: Record<string, () => Promise<PriceFile[]>> = {
  lidl: async () => [await scrapeLidl({ rules, log, ...(maxPages !== undefined ? { maxPages } : {}) })],
  auchan: async () => {
    const files: PriceFile[] = [];
    for (const store of stores.auchan ?? []) {
      files.push(await scrapeAuchan({ rules, store, categories: auchanCategories.categories, maxPages: maxPages ?? auchanCategories.maxPages, log }));
    }
    return files;
  },
};

const wanted: Retailer[] = target === 'all' ? (Object.keys(robots) as Retailer[]) : [target as Retailer];
let ok = 0;
for (const name of wanted) {
  const robot = robots[name];
  if (!robot) {
    console.error(`Robot inconnu : ${name} (disponibles : ${Object.keys(robots).join(', ')})`);
    continue;
  }
  try {
    const files = await robot();
    for (const file of files) {
      const path = writePriceFile(outDir, file);
      log(`→ ${path} (${file.prices.length} relevés)`);
    }
    ok++;
  } catch (err) {
    console.error(`✗ ${name} : ${(err as Error).stack ?? err}`);
  }
}
const index = writeIndex(outDir);
log(`Index : ${index.files.length} fichier(s) → ${resolve(outDir, 'index.json')}`);
process.exit(ok > 0 ? 0 : 1);
