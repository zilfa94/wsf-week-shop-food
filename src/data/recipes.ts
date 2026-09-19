/** Toutes les recettes (docs/SPEC.md § 3.3), concaténées par groupe. */
import type { Recipe } from '../core/types';
import { RECIPES_ASIAN } from './recipes-asian';
import { RECIPES_BREAKFAST } from './recipes-breakfast';
import { RECIPES_FRENCH } from './recipes-french';
import { RECIPES_MEDITERRANEAN } from './recipes-mediterranean';
import { RECIPES_ORIENTAL } from './recipes-oriental';
import { RECIPES_SNACKS } from './recipes-snacks';
import { RECIPES_VEGGIE } from './recipes-veggie';

export const RECIPES: readonly Recipe[] = [
  ...RECIPES_BREAKFAST,
  ...RECIPES_SNACKS,
  ...RECIPES_FRENCH,
  ...RECIPES_MEDITERRANEAN,
  ...RECIPES_ASIAN,
  ...RECIPES_ORIENTAL,
  ...RECIPES_VEGGIE,
];
