/** Toutes les recettes (docs/SPEC.md § 3.3), concaténées par groupe. */
import type { Recipe } from '../core/types';
import { RECIPES_ASIAN } from './recipes-asian';
import { RECIPES_ASIAN_PLUS } from './recipes-asian-plus';
import { RECIPES_BREAKFAST } from './recipes-breakfast';
import { RECIPES_FRENCH } from './recipes-french';
import { RECIPES_FRENCH_PLUS } from './recipes-french-plus';
import { RECIPES_MEDITERRANEAN } from './recipes-mediterranean';
import { RECIPES_MEDITERRANEAN_PLUS } from './recipes-mediterranean-plus';
import { RECIPES_ORIENTAL } from './recipes-oriental';
import { RECIPES_ORIENTAL_PLUS } from './recipes-oriental-plus';
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
  // Deuxième série par famille de cuisine (cuisines préférées, 2026-09-21).
  ...RECIPES_FRENCH_PLUS,
  ...RECIPES_MEDITERRANEAN_PLUS,
  ...RECIPES_ASIAN_PLUS,
  ...RECIPES_ORIENTAL_PLUS,
];
