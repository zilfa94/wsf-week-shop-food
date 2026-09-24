/**
 * Photos des plats — GÉNÉRÉ par `scripts/dish-photos.py`, ne pas éditer à la main.
 * Banque d'images Pexels (assets/images/dishes/LICENSE.md, crédits dans CREDITS.json).
 * Ce sont des photos d'illustration : elles montrent un plat de ce type, pas le résultat
 * exact de notre recette — l'écran Recette le précise.
 *
 * Table vide tant que les photos ne sont pas téléchargées : l'app retombe alors sur
 * l'illustration 3D de la recette (`FoodImage`), sans rien casser.
 */
import type { ImageSourcePropType } from 'react-native';

export const DISH_PHOTOS: Readonly<Record<string, ImageSourcePropType>> = {};

/** Photo d'un plat, ou `undefined` si la recette n'en a pas encore. */
export const dishPhoto = (recipeId: string): ImageSourcePropType | undefined => DISH_PHOTOS[recipeId];
