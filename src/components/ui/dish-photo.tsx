import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { dishPhoto } from '@/data/dish-photos';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { FoodImage } from './food-image';

export interface DishPhotoProps {
  readonly recipeId: string;
  /** Hauteur de la photo (pt) ; la largeur suit le conteneur. */
  readonly height?: number;
  /** Mention « photo d'illustration » : obligatoire sur la fiche recette, superflue sur une vignette. */
  readonly caption?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Photo réelle du plat quand elle existe, illustration 3D sinon — l'app ne doit jamais montrer
 * un cadre vide. La photo vient d'une banque d'images : elle montre **un** plat de ce type, pas le
 * résultat de notre recette, d'où la mention affichée (règle de crédibilité, CLAUDE.md § 2).
 */
export function DishPhoto({ recipeId, height = 200, caption = false, style }: DishPhotoProps) {
  const theme = useTheme();
  const photo = dishPhoto(recipeId);
  if (!photo) {
    return <FoodImage recipeId={recipeId} size={height} tile="none" style={[styles.fallback, style]} />;
  }
  return (
    <View style={[styles.block, style]}>
      <Image source={photo} style={[styles.photo, { height, backgroundColor: theme.surfaceAlt }]} resizeMode="cover" accessibilityIgnoresInvertColors />
      {caption ? (
        <AppText variant="caption" color="textMuted">
          Photo d’illustration : le plat peut différer de votre préparation.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.xs },
  photo: { width: '100%', borderRadius: Radius.card },
  fallback: { alignSelf: 'center' },
});
