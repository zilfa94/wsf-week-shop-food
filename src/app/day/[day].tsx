import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MealCard } from '@/components/plan/meal-card';
import { AppText, EmptyState, MacroBar, Screen } from '@/components/ui';
import { WEEKDAY_LABELS } from '@/core/labels';
import type { Weekday } from '@/core/types';
import { useAppStore } from '@/store';
import { RECIPE_INDEX, useDayNutrition } from '@/store/hooks';

export default function DayScreen() {
  const router = useRouter();
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = Math.min(6, Math.max(0, Number(dayParam) || 0)) as Weekday;
  const plan = useAppStore((s) => s.currentPlan);
  const showCalories = useAppStore((s) => s.settings.showCalories);
  const nutrition = useDayNutrition(day);
  const meals = plan?.meals.filter((m) => m.slot.day === day) ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: WEEKDAY_LABELS[day] }} />
      {nutrition ? (
        <>
          <AppText variant="h2">{`Équilibre du jour : ${nutrition.score}/100`}</AppText>
          <MacroBar macros={nutrition.macros} showCalories={showCalories} />
        </>
      ) : null}
      {meals.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Aucun repas ce jour" />
      ) : (
        meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} recipe={RECIPE_INDEX.get(meal.recipeId)} showCalories={showCalories} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: meal.recipeId, mealId: meal.id } })} />
        ))
      )}
    </Screen>
  );
}
