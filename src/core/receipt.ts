/**
 * Lecture d'un ticket de caisse : chaque ligne → un ingrédient du jeu de données, avec sa quantité.
 * Sert à remplir le garde-manger après les courses sans tout ressaisir (docs/SPEC.md § 1.4).
 *
 * Deux différences assumées avec le rattachement des **prix** (`scraper/`) :
 *
 * 1. **Le ticket parle un autre dialecte.** Une fiche produit dit « Pavé de saumon frais », le ticket
 *    dit « SAUMON PAVE X2 ». D'où l'expansion des abréviations (`PDT`, `CRM`, `FROM`…) et une
 *    correspondance par **mots présents dans un ordre libre** plutôt que par phrase exacte.
 * 2. **Une erreur n'a pas le même coût.** Un prix faux est un mensonge ; une ligne de ticket mal lue
 *    n'est qu'une proposition que l'utilisateur corrige avant de valider. On peut donc être plus
 *    tolérant ici — à condition que l'écran demande confirmation, ce que fait `receipt.tsx`.
 */
import { GLOBAL_NOT, MATCH_RULES, type MatchRule } from '@/data/match-rules';
import { roundToPackaging } from './packaging';
import type { CanonicalUnit, Ingredient, IngredientId } from './types';

/** Abréviations courantes des tickets français : le mot du ticket → sa forme longue. */
export const RECEIPT_ABBREVIATIONS: Readonly<Record<string, string>> = {
  pdt: 'pomme de terre',
  pdts: 'pommes de terre',
  crm: 'creme',
  from: 'fromage',
  fromg: 'fromage',
  mozza: 'mozzarella',
  ban: 'banane',
  tom: 'tomate',
  toms: 'tomates',
  cts: 'carottes',
  emm: 'emmental',
  parm: 'parmesan',
  yt: 'yaourt',
  yaourts: 'yaourt',
  choco: 'chocolat',
  poiv: 'poivron',
  courg: 'courgette',
  champ: 'champignon',
  champs: 'champignons',
  concomb: 'concombre',
  past: 'pasteurise',
  ecrem: 'ecreme',
  'demi ecrem': 'demi ecreme',
  esc: 'escalope',
  fil: 'filet',
  cuiss: 'cuisse',
  hach: 'hache',
  surg: 'surgele',
  bq: 'barquette',
  bqt: 'barquette',
  sach: 'sachet',
  plaq: 'plaquette',
  brq: 'brique',
  vge: 'vierge',
  ex: 'extra',
  huil: 'huile',
  ptit: 'petit',
  pts: 'petits',
  leg: 'legumes',
  nat: 'nature',
  entr: 'entier',
};

/** Mots d'enseigne, de conditionnement ou de promotion : ils n'aident jamais à reconnaître l'aliment. */
const NOISE = new Set([
  'crf', 'carrefour', 'auchan', 'leclerc', 'casino', 'lidl', 'aldi', 'monoprix', 'intermarche', 'franprix', 'u', 'cora',
  'bio', 'label', 'rouge', 'aop', 'aoc', 'igp', 'promo', 'lot', 'offre', 'remise', 'carte', 'fidelite',
  'barquette', 'sachet', 'plaquette', 'brique', 'boite', 'pack', 'pot', 'flacon', 'bouteille', 'paquet',
  'origine', 'france', 'francais', 'francaise', 'qualite', 'premium', 'selection', 'reflets',
]);

/** « 1/2 » écrit sur les tickets pour « demi ». */
const HALF = /(^|\s)1\s*\/\s*2(\s|$)/g;

export interface ReceiptLine {
  /** Ligne brute, telle que lue sur le ticket. */
  readonly raw: string;
  /** Libellé normalisé qui a servi au rattachement. */
  readonly label: string;
  /** Ingrédient reconnu, ou `null` si la ligne n'a pas été comprise. */
  readonly ingredientId: IngredientId | null;
  /** Quantité lue sur la ligne, en unité canonique de l'ingrédient ; `null` si illisible. */
  readonly quantity: number | null;
  /** Prix payé en euros, quand la ligne le porte. */
  readonly price: number | null;
}

/** Minuscules, sans accents, ponctuation en espaces — même normalisation que le scraper. */
export function normalizeLabel(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[’']/g, ' ')
    // La virgule décimale est protégée avant le nettoyage : sans cela « 1,5KG » devient « 1 5KG »
    // et la quantité lue vaut 5 kg au lieu de 1,5 kg.
    .replace(/(\d)[.,](\d)/g, '$1·$2')
    .replace(/[^a-z0-9/·]+/g, ' ')
    .replace(/·/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Développe les abréviations et retire les mots d'enseigne et de conditionnement. */
export function expandAbbreviations(label: string): string {
  const half = label.replace(HALF, ' demi ');
  // Le filtre s'applique APRÈS l'expansion : « BQT » devient « barquette », qui est un mot
  // d'emballage à retirer — sinon il déclenche une exclusion et la ligne est perdue.
  const words = half
    .split(' ')
    .flatMap((w) => (RECEIPT_ABBREVIATIONS[w] ?? w).split(' '))
    .filter((w) => w && !NOISE.has(w));
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Quantité écrite sur la ligne, ramenée à l'unité canonique de l'ingrédient.
 * Reconnaît « 500G », « 1KG », « 75CL », « 1L », « X6 », « 2X70G », « 0,432 KG ».
 */
export function parseQuantity(label: string, unit: CanonicalUnit): number | null {
  const text = label.replace(/,/g, '.');
  const multiple = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|cl|ml|l)\b/.exec(text);
  const single = /(\d+(?:\.\d+)?)\s*(kg|g|cl|ml|l)\b/.exec(text);
  const pieces = /(?:^|\s)x\s*(\d+)(?:\s|$)/.exec(text);

  const toCanonical = (value: number, suffix: string): number | null => {
    const grams: Record<string, number> = { kg: 1000, g: 1 };
    const millis: Record<string, number> = { l: 1000, cl: 10, ml: 1 };
    if (unit === 'g' && grams[suffix] !== undefined) return value * grams[suffix]!;
    if (unit === 'ml' && millis[suffix] !== undefined) return value * millis[suffix]!;
    return null;
  };

  if (multiple) {
    const q = toCanonical(Number(multiple[2]), multiple[3]!);
    if (q !== null) return q * Number(multiple[1]);
    if (unit === 'piece') return Number(multiple[1]) * Number(multiple[2]);
  }
  if (single) {
    const q = toCanonical(Number(single[1]), single[2]!);
    if (q !== null) return q;
  }
  if (pieces && unit === 'piece') return Number(pieces[1]);
  return null;
}

/** Prix en euros en fin de ligne (« … 2,99 » ou « … 2,99 € »). */
export function parsePrice(raw: string): number | null {
  const m = /(\d+[.,]\d{2})\s*(?:€|eur)?\s*$/i.exec(raw.trim());
  return m ? Number(m[1]!.replace(',', '.')) : null;
}

const words = (text: string): string[] => text.split(' ').filter(Boolean);

/** Tous les mots de `phrase` sont-ils présents dans `label` (mots entiers, ordre libre, pluriel toléré) ? */
export function containsAllWords(label: string, phrase: string): boolean {
  const present = new Set(words(label).flatMap((w) => (w.endsWith('s') ? [w, w.slice(0, -1)] : [w, `${w}s`])));
  return words(phrase).every((w) => present.has(w));
}

function ruleRejects(label: string, rule: MatchRule): boolean {
  const forbidden = [...GLOBAL_NOT, ...(rule.not ?? [])];
  return forbidden.some((phrase) => containsAllWords(label, phrase));
}

/**
 * Ingrédient le plus probable pour un libellé de ticket : parmi les règles dont une expression est
 * entièrement présente, celle dont l'expression reconnue est la plus précise (le plus de mots).
 * `null` si rien ne correspond ou si une exclusion s'applique.
 */
export function matchReceiptLabel(label: string, rules: Readonly<Record<string, MatchRule>> = MATCH_RULES): IngredientId | null {
  let best: { id: string; score: number } | null = null;
  for (const [id, rule] of Object.entries(rules)) {
    const matched = rule.any.filter((phrase) => containsAllWords(label, phrase));
    if (matched.length === 0 || ruleRejects(label, rule)) continue;
    const score = Math.max(...matched.map((phrase) => words(phrase).length));
    if (!best || score > best.score || (score === best.score && id < best.id)) best = { id, score };
  }
  return best ? (best.id as IngredientId) : null;
}

/** Une ligne de ticket est-elle exploitable ? Écarte les totaux, moyens de paiement et en-têtes. */
const IGNORED = /^(total|sous total|dont tva|tva|montant|carte|cb|especes|espececes|rendu|monnaie|merci|ticket|caisse|date|heure|siret|magasin|nb article|nombre d article|points|fidelite|remise|avantage|a payer|paiement)/;

export function isIgnorableLine(label: string): boolean {
  return label.length < 3 || IGNORED.test(label) || /^\d[\d\s.,/€-]*$/.test(label);
}

/**
 * Lit un ticket entier. Les lignes non comprises sont **conservées** avec `ingredientId: null` :
 * l'écran les montre pour que l'utilisateur les corrige, plutôt que de les faire disparaître.
 */
export function readReceipt(
  text: string,
  ingredients: ReadonlyMap<IngredientId, Ingredient>,
  rules: Readonly<Record<string, MatchRule>> = MATCH_RULES,
): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const normalized = normalizeLabel(raw);
    if (isIgnorableLine(normalized)) continue;
    const label = expandAbbreviations(normalized);
    const ingredientId = matchReceiptLabel(label, rules);
    const ingredient = ingredientId ? ingredients.get(ingredientId) : undefined;
    out.push({
      raw: raw.trim(),
      label,
      ingredientId,
      quantity: ingredient ? (parseQuantity(label, ingredient.canonicalUnit) ?? defaultPack(ingredient)) : null,
      price: parsePrice(raw),
    });
  }
  return out;
}

/** À défaut de quantité lisible, un conditionnement standard : c'est ce que l'utilisateur a rapporté. */
function defaultPack(ingredient: Ingredient): number {
  return roundToPackaging(ingredient.packaging, ingredient.packaging.size).bought;
}
