/** Ordre de parcours d'un magasin type ; chaque rayon exactement une fois (vérifié par test). */
import type { Aisle } from './types';

export const AISLE_ORDER: readonly Aisle[] = [
  'fruits_vegetables',
  'bakery',
  'butcher',
  'fish',
  'dairy',
  'dry_goods',
  'condiments',
  'sweet_grocery',
  'drinks',
  'frozen',
  'other',
];

export function aisleRank(aisle: Aisle): number {
  const i = AISLE_ORDER.indexOf(aisle);
  return i === -1 ? AISLE_ORDER.length : i;
}
