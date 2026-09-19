/**
 * Point d'entrée du jeu de données embarqué. `DATASET_VERSION` doit changer à chaque modification
 * des recettes ou des ingrédients : le store invalide un plan généré avec une autre version.
 */
import type { Dataset } from '../core/types';
import { INGREDIENTS } from './ingredients';
import { RECIPES } from './recipes';

export const DATASET_VERSION = '2026.09.1';

export const DATASET: Dataset = {
  version: DATASET_VERSION,
  ingredients: INGREDIENTS,
  recipes: RECIPES,
};

export { INGREDIENTS, RECIPES };
