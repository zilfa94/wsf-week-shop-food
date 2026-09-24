import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, Chip, DishPhoto } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { MEAL_TYPE_LABELS } from '@/core/labels';
import type { Meal, Recipe } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

export interface MealCardProps {
  readonly meal: Meal;
  readonly recipe: Recipe | undefined;
  readonly showCalories?: boolean;
  readonly onPress: () => void;
  readonly onLongPress?: () => void;
}

/** Carte d'un repas planifié : image du plat, type, nom, durée, kcal, état (verrouillé, cuisiné, restes). */
export function MealCard({ meal, recipe, showCalories = true, onPress, onLongPress }: MealCardProps) {
  const theme = useTheme();
  const minutes = recipe ? recipe.prepMin + recipe.cookMin : 0;
  const name = recipe?.name ?? 'Recette indisponible';
  const status = meal.cooked ? 'cuisiné' : meal.locked ? 'verrouillé' : meal.leftoverOf ? 'restes' : '';
  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${MEAL_TYPE_LABELS[meal.slot.type]} : ${name}${status ? `, ${status}` : ''}`}
      style={[styles.card, meal.cooked ? styles.cooked : null]}
    >
      {/* Photo du plat si elle existe, illustration 3D sinon. */}
      <DishPhoto recipeId={meal.recipeId} square={68} fallbackTile={meal.leftoverOf ? 'accent' : 'soft'} />
      <View style={styles.body}>
        <View style={styles.header}>
          <AppText variant="caption" color="textMuted">
            {MEAL_TYPE_LABELS[meal.slot.type]}
          </AppText>
          <View style={styles.icons}>
            {meal.locked ? <Ionicons name="lock-closed" size={16} color={theme.textMuted} /> : null}
            {meal.cooked ? <Ionicons name="checkmark-circle" size={18} color={theme.success} /> : null}
          </View>
        </View>
        <AppText variant="bodyStrong" numberOfLines={2} style={meal.cooked ? styles.strike : undefined}>
          {name}
        </AppText>
        <View style={styles.meta}>
          {meal.leftoverOf ? (
            <Chip label="Restes de la veille" icon="repeat" />
          ) : (
            <AppText variant="caption" color="textMuted" tabular>
              {`${minutes} min${showCalories && recipe ? ` · ${Math.round(recipe.nutritionPerServing.kcal)} kcal` : ''}${meal.servings > 0 ? ` · ${meal.servings} portion${meal.servings > 1 ? 's' : ''}` : ''}`}
            </AppText>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  body: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icons: { flexDirection: 'row', gap: Spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cooked: { opacity: 0.65 },
  strike: { textDecorationLine: 'line-through' },
});
