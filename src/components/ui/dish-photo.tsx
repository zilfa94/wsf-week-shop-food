import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { dishPhoto } from '@/data/dish-photos';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { FoodImage, type FoodImageProps } from './food-image';

export interface DishPhotoProps {
  readonly recipeId: string;
  /** Bandeau : hauteur de la photo (pt), largeur = conteneur. Ignoré si `square` est fourni. */
  readonly height?: number;
  /** Vignette carrée de ce côté (pt) : cartes de repas, propositions de remplacement. */
  readonly square?: number;
  /**
   * Mention « image d'illustration » : obligatoire sur la fiche recette, superflue sur une vignette.
   * Le mot « image » et non « photo » : certaines sont des photos de banque, d'autres sont générées
   * par une IA (voir `CREDITS.json`) — l'app ne promet donc pas une photographie.
   */
  readonly caption?: boolean;
  /** Pastille de l'illustration 3D quand aucune photo n'existe encore. */
  readonly fallbackTile?: FoodImageProps['tile'];
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Photo réelle du plat quand elle existe, illustration 3D sinon — l'app ne doit jamais montrer
 * un cadre vide. La photo vient d'une banque d'images : elle montre **un** plat de ce type, pas le
 * résultat de notre recette, d'où la mention affichée sur la fiche (CLAUDE.md § 2).
 */
export function DishPhoto({ recipeId, height = 200, square, caption = false, fallbackTile = 'none', style }: DishPhotoProps) {
  const theme = useTheme();
  const photo = dishPhoto(recipeId);
  if (!photo) {
    return <FoodImage recipeId={recipeId} size={square ?? height} tile={fallbackTile} style={style} />;
  }
  if (square) {
    // Le cadre porte le style du conteneur (ViewStyle) ; l'image se contente de le remplir.
    return (
      <View style={[styles.square, { width: square, height: square, backgroundColor: theme.surfaceAlt }, style]}>
        <Image source={photo} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={[styles.block, style]}>
      <Image source={photo} style={[styles.photo, { height, backgroundColor: theme.surfaceAlt }]} resizeMode="cover" accessibilityIgnoresInvertColors />
      {caption ? (
        <AppText variant="caption" color="textMuted">
          Image d’illustration : le plat peut différer de votre préparation.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.xs },
  photo: { width: '100%', borderRadius: Radius.card },
  square: { borderRadius: Radius.image, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
});
