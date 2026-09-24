/**
 * Recopie le vocabulaire de rattachement du scraper dans l'app : `scraper/config/ingredients.json`
 * → `src/data/match-rules.ts`.
 *
 * Pourquoi une copie plutôt qu'un import : `src/` ne doit jamais importer `scraper/` (CLAUDE.md § 4.4,
 * dépendances et tsconfig séparés). Le JSON reste la source unique ; ce script rejoue la copie.
 *
 *     npm run rules:sync
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'scraper/config/ingredients.json');
const out = resolve(root, 'src/data/match-rules.ts');

const config = JSON.parse(readFileSync(src, 'utf8'));
const ids = Object.keys(config.rules).sort();

const lines = [
  '/**',
  ' * Vocabulaire de rattachement « libellé → ingrédient » — GÉNÉRÉ par `npm run rules:sync`,',
  ' * copié depuis `scraper/config/ingredients.json` (source unique). Ne pas éditer à la main :',
  " * `src/` n'importe jamais `scraper/` (CLAUDE.md § 4.4), d'où cette copie générée.",
  ' */',
  '',
  'export interface MatchRule {',
  '  /** Au moins une de ces expressions doit être présente (mots entiers, ordre libre). */',
  '  readonly any: readonly string[];',
  '  /** Aucune de ces expressions ne doit être présente. */',
  '  readonly not?: readonly string[];',
  '}',
  '',
  '/** Exclusions communes : plats préparés, non-alimentaire, boissons… */',
  `export const GLOBAL_NOT: readonly string[] = ${JSON.stringify(config.globalNot)};`,
  '',
  'export const MATCH_RULES: Readonly<Record<string, MatchRule>> = {',
  ...ids.map((id) => {
    const rule = config.rules[id];
    const parts = [`any: ${JSON.stringify(rule.any)}`];
    if (rule.not) parts.push(`not: ${JSON.stringify(rule.not)}`);
    return `  ${id}: { ${parts.join(', ')} },`;
  }),
  '};',
  '',
];

writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`${ids.length} règles, ${config.globalNot.length} exclusions globales → src/data/match-rules.ts`);
