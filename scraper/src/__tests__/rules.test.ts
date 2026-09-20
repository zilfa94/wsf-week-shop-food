import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { matchIngredients, normalize } from '../match.ts';
import type { RulesConfig } from '../types.ts';
import { parsePack, parseUnitPrice } from '../units.ts';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config/ingredients.json'), 'utf8')) as RulesConfig;

/** Identifiants d'ingrédients de l'app, lus directement dans src/data/ingredients.ts (source unique). */
function appIngredientIds(): Set<string> {
  const src = readFileSync(resolve(here, '../../../src/data/ingredients.ts'), 'utf8');
  return new Set([...src.matchAll(/^\s*id: '([a-z0-9_]+)',/gm)].map((m) => m[1]!));
}

test('chaque règle vise un ingrédient existant et reste compacte (≤ 8 any, ≤ 20 not)', () => {
  const ids = appIngredientIds();
  const problems: string[] = [];
  for (const [id, rule] of Object.entries(config.rules)) {
    if (!ids.has(id)) problems.push(`${id} : ingrédient inconnu`);
    if (rule.any.length === 0 || rule.any.length > 8) problems.push(`${id} : ${rule.any.length} any`);
    if ((rule.not ?? []).length > 20) problems.push(`${id} : ${rule.not!.length} not`);
    for (const p of [...rule.any, ...(rule.not ?? [])]) if (normalize(p) !== p) problems.push(`${id} : « ${p} » n'est pas normalisé`);
  }
  for (const p of config.globalNot) if (normalize(p) !== p) problems.push(`globalNot : « ${p} » n'est pas normalisé`);
  assert.deepEqual(problems, []);
});

test('tous les ingrédients de l’app ont une règle', () => {
  const missing = [...appIngredientIds()].filter((id) => !config.rules[id]);
  assert.deepEqual(missing, []);
});

test('rattachements sur des libellés réels (Lidl)', () => {
  const cases: [string, string[]][] = [
    ['ITALIAMO Fusilli giganti', ['pates']],
    ['ITALIAMO Pâte à tartiner', []],
    ['Le pâté Hénaff', []],
    ['SILVERCREST® Cuiseur à riz SRK 400 D2', []],
    ['GOLDENSUN Riz basmati', ['riz_basmati']],
    ["L'étal du Volailler Sauté de filet de poulet", ['poulet_blanc']],
    ["L'étal du Volailler Émincés de filet de poulet", ['poulet_blanc']],
    ['Mini escalopes de poulet panées', []],
    ['ITALIAMO Tomates séchées', []],
    ['SOL&MAR Sauce tomate', ['sauce_tomate']],
    ['ITALIAMO Fromage râpé', ['emmental_rape']],
    ['MILBONA Mozzarella di Bufala Campana AOP', ['mozzarella']],
    ['NIXE Thon à l’huile de tournesol MSC', ['thon_boite']],
    ['Filet de saumon entier avec peau', ['saumon']],
    ['CHEFSELECT Nuggets de poulet', []],
    ['Qualité Suisse Pomme de terre à chair ferme', ['pomme_de_terre']],
    ['MILBONA Yaourt avec morceaux', []],
    ['SOL&MAR Pois chiches bocal', ['pois_chiches']],
    ['Dulano Selection Jambon traditionnel', []],
    ['Poitrine de porc', []],
    ['CIEN Gel douche', []],
    ['Lait demi-écrémé UHT', ['lait']],
    ['Beurre doux 250 g', ['beurre']],
    ['12 œufs de poules élevées en plein air', ['oeuf']],
    // Faux positifs vus lors du premier vrai relevé (2026-09-20) : aucun rattachement.
    ['- Petit pain au chorizo', []],
    ['Ocean Sea Sardines', []],
    ['Ocean Sea Moules et coquillage à la sauce tomate', []],
    ['SOL&MAR Bocaditos aux olives & au romarin', []],
    ["SOL&MAR Filets d'anchois huile de tournesol", []],
    ['ITALIAMO Mascarpone et gorgonzola', []],
    ["L'étal du Boucher Boulettes de porc à l'oignon", []],
    ['Sumol Orange', []],
    ['SOL&MAR Moules marinées', []],
    ["L'étal du Boucher Viande hachée", []],
    ["L'étal du Boucher 2 steaks hachés charolais", ['boeuf_hache']],
    ['Saint Alby Allumettes fumées', ['lardons']],
  ];
  const problems: string[] = [];
  for (const [title, expected] of cases) {
    const got = matchIngredients(title, config).sort();
    if (JSON.stringify(got) !== JSON.stringify([...expected].sort())) problems.push(`${title} → ${got.join(',') || '∅'} (attendu ${expected.join(',') || '∅'})`);
  }
  assert.deepEqual(problems, []);
});

test('lecture des conditionnements et prix unitaires', () => {
  assert.deepEqual(parsePack('750 g (PNE)'), { unit: 'kg', size: 0.75 });
  assert.deepEqual(parsePack('1,2 kg'), { unit: 'kg', size: 1.2 });
  assert.deepEqual(parsePack('6 x 125 g'), { unit: 'kg', size: 0.75 });
  assert.deepEqual(parsePack('1 L'), { unit: 'l', size: 1 });
  assert.deepEqual(parsePack('50 cl'), { unit: 'l', size: 0.5 });
  assert.deepEqual(parsePack('12 pièces'), { unit: 'piece', size: 12 });
  assert.deepEqual(parsePack('La pièce'), { unit: 'piece', size: 1 });
  assert.equal(parsePack('Le 2e produit'), null);
  assert.deepEqual(parseUnitPrice('1 kg = 7,32'), { unit: 'kg', price: 7.32 });
  assert.deepEqual(parseUnitPrice('1 kg = 3,98 €'), { unit: 'kg', price: 3.98 });
  assert.deepEqual(parseUnitPrice('1 L = 4,76 €'), { unit: 'l', price: 4.76 });
  assert.deepEqual(parseUnitPrice('2,49 €/kg'), { unit: 'kg', price: 2.49 });
  assert.equal(parseUnitPrice('Prix conseillé'), null);
});
