/**
 * Couleur de rayon : une pastille devant chaque section de la liste de courses. Purement visuelle —
 * elle donne du rythme à une longue liste de cartes grises (retour du propriétaire, 2026-09-24) et
 * aide à repérer d'un coup d'œil où l'on en est dans le magasin.
 */
import type { Aisle } from '@/core/types';

export const AISLE_COLORS: Readonly<Record<Aisle, string>> = {
  fruits_vegetables: '#4FC97F',
  bakery: '#E0A45C',
  butcher: '#E8607A',
  fish: '#4FB8E8',
  dairy: '#F2D14E',
  dry_goods: '#C89B6A',
  condiments: '#B67BD8',
  sweet_grocery: '#FF8FA8',
  drinks: '#59C6D8',
  frozen: '#7FA6F0',
  other: '#9A9AA3',
};
