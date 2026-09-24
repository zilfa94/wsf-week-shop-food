import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Chip, DishPhoto, EmptyState, FoodImage, MacroBar, Screen, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { CUISINE_LABELS, RECIPE_TAG_LABELS, unitLabel } from '@/core/labels';
import { formatNumber } from '@/core/units';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, RECIPE_INDEX, useRecipeIngredientStatus } from '@/store/hooks';

const STATUS_LABEL = { pantry: 'dans le garde-manger', toBuy: 'à acheter', staple: 'placard', none: '' } as const;

export default function RecipeScreen() {
  const router = useRouter();
  const { id, mealId } = useLocalSearchParams<{ id: string; mealId?: string }>();
  const recipe = RECIPE_INDEX.get(id ?? '');
  const plan = useAppStore((s) => s.currentPlan);
  const showCalories = useAppStore((s) => s.settings.showCalories);
  const setCooked = useAppStore((s) => s.setCooked);
  const status = useRecipeIngredientStatus(id ?? '');
  const meal = mealId ? plan?.meals.find((m) => m.id === mealId) : undefined;
  const servings = meal && meal.servings > 0 ? meal.servings : (plan?.profileSnapshot.persons ?? 2);

  if (!recipe) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Cette recette n’est plus disponible" cta={mealId ? { label: 'Remplacer ce repas', onPress: () => router.push({ pathname: '/swap/[mealId]', params: { mealId } }) } : undefined} />
      </Screen>
    );
  }
  const scale = servings / recipe.servings;

  return (
    <Screen>
      {/* En-tête réduit à la flèche de retour : le nom du plat est le grand titre du contenu. */}
      <Stack.Screen options={{ title: '' }} />
      {/* Photo réelle du plat si on en a une, illustration 3D sinon. */}
      <DishPhoto recipeId={recipe.id} height={200} caption style={styles.hero} />
      <AppText variant="display">{recipe.name}</AppText>
      {recipe.description ? <AppText color="textMuted">{recipe.description}</AppText> : null}
      <View style={styles.wrap}>
        <Chip label={CUISINE_LABELS[recipe.cuisine]} />
        <Chip label={`${recipe.prepMin + recipe.cookMin} min`} icon="time-outline" />
        {recipe.tags.map((t) => (
          <Chip key={t} label={RECIPE_TAG_LABELS[t]} />
        ))}
      </View>

      <SectionHeader title="Ingrédients" subtitle={`pour ${servings} portion${servings > 1 ? 's' : ''}`} />
      <Card>
        {recipe.ingredients.map((ri) => {
          const ing = INGREDIENT_INDEX.get(ri.ingredientId);
          const qty = ri.quantity * scale;
          const s = status.get(ri.ingredientId) ?? 'none';
          return (
            <View key={ri.ingredientId} style={styles.ingredient}>
              <FoodImage ingredientId={ri.ingredientId} size={36} />
              <AppText style={styles.grow}>{`${ing?.name ?? ri.ingredientId}${ri.optional ? ' (facultatif)' : ''}${ri.note ? `, ${ri.note}` : ''}`}</AppText>
              <AppText tabular>{`${formatNumber(qty, 1)} ${unitLabel(ri.unit, qty)}`}</AppText>
              {STATUS_LABEL[s] ? (
                <AppText variant="caption" color={s === 'pantry' ? 'success' : 'textMuted'}>
                  {STATUS_LABEL[s]}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Étapes" />
      <Card>
        {recipe.steps.map((step, i) => (
          <AppText key={i}>{`${i + 1}. ${step}`}</AppText>
        ))}
      </Card>

      <SectionHeader title="Nutrition" subtitle="par portion" />
      <MacroBar macros={recipe.nutritionPerServing} showCalories={showCalories} />

      {meal ? (
        <View style={styles.actions}>
          <Button label={meal.cooked ? 'Cuisiné ✓' : 'Marquer cuisiné'} onPress={() => setCooked(meal.id, !meal.cooked)} variant={meal.cooked ? 'secondary' : 'primary'} icon="checkmark" />
          <Button label="Remplacer" variant="secondary" onPress={() => router.push({ pathname: '/swap/[mealId]', params: { mealId: meal.id } })} icon="swap-horizontal" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: Spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  grow: { flex: 1 },
  actions: { gap: Spacing.sm },
});
