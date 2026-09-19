import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, Chip, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { MEAL_TYPE_LABELS, WEEKDAY_LABELS } from '@/core/labels';
import { useHaptics } from '@/hooks/use-haptics';
import { useAppStore } from '@/store';
import { RECIPE_INDEX, useSwapSuggestions, useToday } from '@/store/hooks';

/** Remplacer un repas : 5 alternatives triées par impact sur la liste de courses. */
export default function SwapScreen() {
  const router = useRouter();
  const today = useToday();
  const haptics = useHaptics();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const plan = useAppStore((s) => s.currentPlan);
  const swapMeal = useAppStore((s) => s.swapMeal);
  const suggestions = useSwapSuggestions(mealId ?? '');
  const meal = plan?.meals.find((m) => m.id === mealId);

  if (!plan || !meal) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Repas introuvable" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="h1">{`${MEAL_TYPE_LABELS[meal.slot.type]} de ${WEEKDAY_LABELS[meal.slot.day].toLowerCase()}`}</AppText>
      <AppText color="textMuted">{`Actuellement : ${RECIPE_INDEX.get(meal.recipeId)?.name ?? '—'}`}</AppText>
      {suggestions.length === 0 ? (
        <EmptyState icon="search-outline" title="Aucune alternative compatible avec vos contraintes pour ce créneau" body="Assouplissez le temps de cuisine ou les aversions dans le Profil." />
      ) : (
        suggestions.map((s) => {
          const recipe = RECIPE_INDEX.get(s.recipeId);
          const good = s.deltaPrice <= 0;
          return (
            <Card
              key={s.recipeId}
              tone={s.reusedIngredientIds.length > 0 ? 'accent' : good ? 'alt' : 'surface'}
              onPress={() => {
                swapMeal(meal.id, s.recipeId, today);
                haptics.success();
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)');
              }}
              accessibilityLabel={`Choisir ${recipe?.name ?? s.recipeId}`}
            >
              <AppText variant="bodyStrong">{recipe?.name ?? s.recipeId}</AppText>
              <View style={styles.wrap}>
                {s.reasons.map((r) => (
                  <Chip key={r} label={r} icon={r.startsWith('Utilise') ? 'repeat' : undefined} />
                ))}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
