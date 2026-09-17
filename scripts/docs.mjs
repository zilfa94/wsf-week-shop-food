#!/usr/bin/env node
/**
 * Outillage de la documentation de suivi (AVANCEMENT.md). Voir CLAUDE.md § 8.
 *
 *   node scripts/docs.mjs status [--verify]   régénère le bloc auto d'AVANCEMENT.md
 *                                             (--verify : lance aussi typecheck + tests, lent)
 *   node scripts/docs.mjs check               hook Stop de Claude Code : lit le JSON sur stdin,
 *                                             bloque si du code a changé sans mise à jour manuelle
 *   node scripts/docs.mjs check --staged      hook git pre-commit : même règle sur l'index
 *   node scripts/docs.mjs install-hooks       git config core.hooksPath .githooks (via npm prepare)
 *
 * Aucune dépendance : Node ≥ 18, git. Fonctionne sous Windows / Git Bash / PowerShell.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = resolve(ROOT, 'AVANCEMENT.md');
const AUTO_START = '<!-- auto:start';
const AUTO_END = '<!-- auto:end -->';
/** Chemins dont la modification exige une mise à jour manuelle d'AVANCEMENT.md. */
const CODE_PATHS = [/^src\//, /^assets\//, /^package\.json$/, /^app\.json$/, /^tsconfig\.json$/];

// ---------------------------------------------------------------------------
// utilitaires
// ---------------------------------------------------------------------------

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r?\n$/, '');
  } catch {
    return null;
  }
}

function listFiles(dir, predicate) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (name === 'node_modules' || name.startsWith('.')) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (predicate(relative(ROOT, p).replace(/\\/g, '/'))) out.push(p);
    }
  };
  walk(abs);
  return out;
}

function countMatches(files, re) {
  let n = 0;
  for (const f of files) n += (readFileSync(f, 'utf8').match(re) ?? []).length;
  return n;
}

/**
 * Partie d'AVANCEMENT.md rédigée à la main (bloc auto retiré), normalisée pour la comparaison :
 * fins de ligne LF et sans blancs finaux (git() retire le \n final de `git show`, pas readFileSync).
 */
function manualPart(text) {
  if (text == null) return null;
  const a = text.indexOf(AUTO_START);
  const b = text.indexOf(AUTO_END);
  const manual = a === -1 || b === -1 || b < a ? text : text.slice(0, a) + text.slice(b + AUTO_END.length);
  return manual.replace(/\r\n/g, '\n').replace(/\s+$/, '');
}

function isCodePath(p) {
  return CODE_PATHS.some((re) => re.test(p));
}

/** Chemins modifiés dans l'arbre de travail (suivis ou non), format porcelain v1. */
function workingTreeChanges() {
  const out = git(['status', '--porcelain', '--untracked-files=all']);
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const p = line.slice(3);
      const arrow = p.indexOf(' -> ');
      return (arrow === -1 ? p : p.slice(arrow + 4)).replace(/^"|"$/g, '');
    });
}

function fmtLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// status : bloc auto-généré
// ---------------------------------------------------------------------------

function runCheck(label, cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  const ok = r.status === 0;
  process.stderr.write(`${label}: ${ok ? 'OK' : 'ÉCHEC'}\n`);
  return ok;
}

function buildAutoBlock({ verify, previous }) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) ?? '(pas de dépôt)';
  const last = git(['log', '-1', '--date=short', '--format=%h « %s » (%ad)']) ?? 'aucun commit';
  const dirty = workingTreeChanges();
  const tree = dirty.length ? `${dirty.length} fichier(s) modifié(s) non commité(s)` : 'propre';

  const core = listFiles('src/core', (p) => /\.ts$/.test(p) && !/__tests__\//.test(p)).length;
  const testFiles = listFiles('src', (p) => /__tests__\/.*\.test\.tsx?$/.test(p));
  const tests = countMatches(testFiles, /^\s*(it|test)\(/gm);
  const recipes = countMatches(listFiles('src/data', (p) => /recipes[^/]*\.ts$/.test(p)), /^\s*\{?\s*id:\s*['"`]/gm);
  const ingredients = countMatches(listFiles('src/data', (p) => /ingredients[^/]*\.ts$/.test(p)), /^\s*\{?\s*id:\s*['"`]/gm);
  const routes = listFiles('src/app', (p) => /\.tsx$/.test(p) && !/_layout\.tsx$/.test(p)).length;
  const components = listFiles('src/components', (p) => /\.tsx$/.test(p)).length;
  const store = listFiles('src/store', (p) => /\.ts$/.test(p)).length;

  let verification;
  if (verify) {
    const tc = runCheck('typecheck', 'npm', ['run', '--silent', 'typecheck']);
    const je = runCheck('jest', 'npx', ['jest', '--silent']);
    verification = `typecheck ${tc ? '✅' : '❌'} · tests ${je ? '✅' : '❌'} (vérifié le ${fmtLocal(new Date())})`;
  } else {
    const prev = previous?.match(/^- Vérification : (.*)$/m)?.[1];
    verification = prev ?? 'non exécutée (`npm run docs:verify`)';
  }

  return [
    `${AUTO_START} — généré par \`npm run docs:status\`, NE PAS ÉDITER À LA MAIN -->`,
    `- Généré le : ${fmtLocal(new Date())}`,
    `- Branche : \`${branch}\` — dernier commit : ${last}`,
    `- Arbre de travail : ${tree}`,
    `- Code : core ${core} fichier(s) · tests ${tests} cas dans ${testFiles.length} fichier(s) · données ≈ ${recipes} recette(s), ≈ ${ingredients} ingrédient(s) · routes ${routes} · composants ${components} · store ${store}`,
    `- Vérification : ${verification}`,
    AUTO_END,
  ].join('\n');
}

function writeStatus({ verify }) {
  const text = readFileSync(DOC, 'utf8');
  const a = text.indexOf(AUTO_START);
  const b = text.indexOf(AUTO_END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(`AVANCEMENT.md : marqueurs ${AUTO_START} … ${AUTO_END} introuvables`);
  }
  const previous = text.slice(a, b + AUTO_END.length);
  const block = buildAutoBlock({ verify, previous });
  const next = text.slice(0, a) + block + text.slice(b + AUTO_END.length);
  if (next !== text) writeFileSync(DOC, next);
  process.stderr.write('AVANCEMENT.md : bloc auto régénéré\n');
  return block;
}

// ---------------------------------------------------------------------------
// check : garde-fous
// ---------------------------------------------------------------------------

const HOWTO =
  'Avant de terminer / commiter : 1) mettre à jour AVANCEMENT.md à la main — section « Reprise » ' +
  '(état + prochaine étape), cases Fait / À faire, une ligne datée dans « Journal » ; ' +
  '2) `npm run docs:status` ; 3) relancer le commit. Voir CLAUDE.md § 8.';

function checkStaged() {
  if (process.env.WSF_SKIP_DOCS_CHECK === '1') return 0;
  const head = git(['show', 'HEAD:AVANCEMENT.md']);
  if (head === null) return 0; // premier commit ou fichier absent de HEAD

  // 1. bloc auto toujours frais dans le commit
  writeStatus({ verify: false });
  git(['add', 'AVANCEMENT.md']);

  // 2. si du code est indexé, la partie manuelle doit avoir changé
  const staged = (git(['diff', '--cached', '--name-only']) ?? '').split('\n').filter(Boolean);
  const code = staged.filter(isCodePath);
  if (!code.length) return 0;
  const index = git(['show', ':AVANCEMENT.md']);
  if (manualPart(index) !== manualPart(head)) return 0;

  process.stderr.write(
    `\n✖ Commit refusé : ${code.length} fichier(s) de code indexé(s) (${code.slice(0, 5).join(', ')}${code.length > 5 ? ', …' : ''}) ` +
      `mais la partie rédigée d'AVANCEMENT.md est identique à HEAD.\n${HOWTO}\n` +
      '(Contournement d\'urgence, réservé au propriétaire : WSF_SKIP_DOCS_CHECK=1)\n\n',
  );
  return 1;
}

async function readStdinJson() {
  if (process.stdin.isTTY) return {};
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function checkWorkingTree() {
  const input = await readStdinJson();
  const changed = workingTreeChanges();
  const code = changed.filter(isCodePath);
  if (!code.length) return 0;
  const head = git(['show', 'HEAD:AVANCEMENT.md']);
  if (head === null || !existsSync(DOC)) return 0;
  if (manualPart(readFileSync(DOC, 'utf8')) !== manualPart(head)) return 0;

  const reason =
    `Documentation non mise à jour : ${code.length} fichier(s) de code modifié(s) depuis le dernier commit ` +
    `(${code.slice(0, 8).join(', ')}${code.length > 8 ? ', …' : ''}) mais la partie rédigée d'AVANCEMENT.md est inchangée. ${HOWTO}`;
  // stop_hook_active = Claude continue déjà à cause de ce hook : ne pas boucler, juste avertir.
  const out = input.stop_hook_active ? { systemMessage: `⚠ ${reason}` } : { decision: 'block', reason };
  process.stdout.write(JSON.stringify(out) + '\n');
  return 0;
}

// ---------------------------------------------------------------------------
// install-hooks
// ---------------------------------------------------------------------------

function installHooks() {
  if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
    process.stderr.write('install-hooks : pas un dépôt git, ignoré\n');
    return 0;
  }
  const ok = git(['config', 'core.hooksPath', '.githooks']) !== null;
  process.stderr.write(ok ? 'git core.hooksPath = .githooks\n' : 'install-hooks : échec git config\n');
  return 0;
}

// ---------------------------------------------------------------------------

const [cmd, ...flags] = process.argv.slice(2);
const has = (f) => flags.includes(f);
let code = 0;
switch (cmd) {
  case 'status':
    writeStatus({ verify: has('--verify') });
    break;
  case 'check':
    code = has('--staged') ? checkStaged() : await checkWorkingTree();
    break;
  case 'install-hooks':
    code = installHooks();
    break;
  default:
    process.stderr.write('usage : node scripts/docs.mjs <status [--verify] | check [--staged] | install-hooks>\n');
    code = 2;
}
// Pas de process.exit() : sur un pipe, stdout est asynchrone et la sortie JSON du hook serait tronquée.
process.exitCode = code;
