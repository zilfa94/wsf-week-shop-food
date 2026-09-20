import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Radius } from '@/constants/theme';
import { FOOD_IMAGES, INGREDIENT_IMAGE, RECIPE_IMAGE, type FoodImageKey } from '@/data/food-images';
import { useTheme } from '@/hooks/use-theme';

export interface FoodImageProps {
  /** Ingrédient ou recette : la table `src/data/food-images.ts` donne l'image. */
  readonly ingredientId?: string;
  readonly recipeId?: string;
  /** Côté du carré (pt). */
  readonly size?: number;
  /** Pastille de fond (gris léger ou jaune pâle) comme les catégories du modèle ; `none` = image seule. */
  readonly tile?: 'soft' | 'accent' | 'none';
  readonly style?: StyleProp<ViewStyle>;
}

export function foodImageKey(ingredientId?: string, recipeId?: string): FoodImageKey | undefined {
  if (recipeId) return RECIPE_IMAGE[recipeId];
  if (ingredientId) return INGREDIENT_IMAGE[ingredientId];
  return undefined;
}

/** Image PNG d'un produit ou d'un plat (Fluent Emoji 3D), dans une pastille arrondie. */
export function FoodImage({ ingredientId, recipeId, size = 56, tile = 'soft', style }: FoodImageProps) {
  const theme = useTheme();
  const key = foodImageKey(ingredientId, recipeId);
  const background = tile === 'accent' ? theme.primarySoft : tile === 'soft' ? theme.surfaceAlt : 'transparent';
  const inner = tile === 'none' ? size : Math.round(size * 0.72);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, borderRadius: Math.min(Radius.image, size / 2.8), backgroundColor: background }, style]}
    >
      {key ? <Image source={FOOD_IMAGES[key]} style={{ width: inner, height: inner }} resizeMode="contain" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
