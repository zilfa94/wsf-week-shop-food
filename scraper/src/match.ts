/**
 * Rattachement d'un libellé produit à nos ingrédients, à partir des règles de
 * scraper/config/ingredients.json. Tout est comparé en texte normalisé (minuscules,
 * sans accents, ponctuation → espaces) et sur des mots entiers : « riz » ne matche pas « rizotto ».
 */
import type { IngredientRule, RulesConfig } from './types.ts';

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const cache = new Map<string, RegExp>();

function phraseRegex(phrase: string): RegExp {
  let re = cache.get(phrase);
  if (!re) {
    const words = normalize(phrase).split(' ').filter(Boolean);
    // Pluriels simples tolérés sur chaque mot (« tomate » ↔ « tomates »).
    re = new RegExp(`(^| )${words.map((w) => `${w}s?`).join(' ')}( |$)`);
    cache.set(phrase, re);
  }
  return re;
}

const hasAny = (n: string, phrases: readonly string[]): boolean => phrases.some((p) => phraseRegex(p).test(n));

export function ruleMatches(normalizedText: string, rule: IngredientRule, globalNot: readonly string[] = []): boolean {
  if (!hasAny(normalizedText, rule.any)) return false;
  if (hasAny(normalizedText, rule.not ?? [])) return false;
  return !hasAny(normalizedText, globalNot);
}

/** Ingrédients auxquels un libellé peut correspondre (plusieurs possibles : « riz basmati » → riz et riz_basmati). */
export function matchIngredients(text: string, config: RulesConfig): string[] {
  const n = normalize(text);
  return Object.entries(config.rules)
    .filter(([, rule]) => ruleMatches(n, rule, config.globalNot))
    .map(([id]) => id);
}

/** Pré-filtre rapide (slugs du sitemap) : le texte contient-il au moins un terme `any` d'une règle ? */
export function couldMatchAny(text: string, config: RulesConfig): boolean {
  const n = normalize(text);
  return Object.values(config.rules).some((rule) => hasAny(n, rule.any));
}
