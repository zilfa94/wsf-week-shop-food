import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MealCard } from '@/components/plan/meal-card';
import { ActionSheet, AppText, Button, Card, EmptyState, Screen, Snackbar, StatTile, type SheetAction } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { addDays, parseISO } from '@/core/date';
import { MONTH_SHORT_LABELS, WEEKDAY_LABELS } from '@/core/labels';
import { incompatibleMeals, isPlanExpired, profileDrift } from '@/core/plan-edit';
import type { Weekday } from '@/core/types';
import { formatPrice } from '@/core/units';
import { DATASET } from '@/data';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { RECIPE_INDEX, useShoppingList, useToday, useWeekNutrition } from '@/store/hooks';

function formatRange(weekStart: string): string {
  const a = parseISO(weekStart);
  const b = parseISO(addDays(weekStart, 6));
  const ma = MONTH_SHORT_LABELS[a.getMonth()]!;
  const mb = MONTH_SHORT_LABELS[b.getMonth()]!;
  return ma === mb ? `Semaine du ${a.getDate()} au ${b.getDate()} ${mb}` : `Semaine du ${a.getDate()} ${ma} au ${b.getDate()} ${mb}`;
}

export default function WeekScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const haptics = useHaptics();
  const plan = useAppStore((s) => s.currentPlan);
  const profile = useAppStore((s) => s.profile);
  const showCalories = useAppStore((s) => s.settings.showCalories);
  const toggleLock = useAppStore((s) => s.toggleLock);
  const setCooked = useAppStore((s) => s.setCooked);
  const startNextWeek = useAppStore((s) => s.startNextWeek);
  const previousPlan = useAppStore((s) => s.previousPlan);
  const undoSwap = useAppStore((s) => s.undoSwap);
  const dismissUndo = useAppStore((s) => s.dismissUndo);
  const list = useShoppingList();
  const nutrition = useWeekNutrition();
  const [snack, setSnack] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ title: string; message?: string; actions: SheetAction[] } | null>(null);

  const expired = plan ? isPlanExpired(plan, today) : false;
  const drift = useMemo(() => (plan ? profileDrift(plan, profile) : []), [plan, profile]);
  const incompatible = useMemo(() => (plan && drift.length > 0 ? incompatibleMeals(plan, profile, DATASET).length : 0), [plan, profile, drift]);

  if (!plan) {
    return (
      <Screen>
        <EmptyState icon="calendar-outline" title="Aucune semaine planifiée" body="Composez 7 jours de vrais plats et la liste de courses qui va avec." cta={{ label: 'Composer ma semaine', onPress: () => router.push('/generating') }} />
      </Screen>
    );
  }

  const cooked = plan.meals.filter((m) => m.cooked).length;
  const toBuy = list ? list.items.filter((i) => i.packs > 0).length : 0;
  const balance = nutrition ? Math.round(nutrition.reduce((s, d) => s + d.score, 0) / nutrition.length) : 0;

  const onMealLongPress = (mealId: string) => {
    const meal = plan.meals.find((m) => m.id === mealId);
    if (!meal) return;
    setSheet({
      title: RECIPE_INDEX.get(meal.recipeId)?.name ?? 'Repas',
      actions: [
        { label: 'Remplacer', icon: 'swap-horizontal', onPress: () => router.push({ pathname: '/swap/[mealId]', params: { mealId } }) },
        { label: meal.locked ? 'Déverrouiller' : 'Verrouiller', icon: meal.locked ? 'lock-open' : 'lock-closed', onPress: () => toggleLock(mealId) },
        {
          label: meal.cooked ? 'Pas encore cuisiné' : 'Marquer cuisiné',
          icon: 'checkmark',
          variant: meal.cooked ? 'secondary' : 'primary',
          onPress: () => {
            setCooked(mealId, !meal.cooked);
            haptics.success();
            setSnack(meal.cooked ? 'Repas remis à cuisiner.' : 'Repas cuisiné : garde-manger mis à jour.');
          },
        },
      ],
    });
  };

  const confirmRegenerate = () =>
    setSheet({
      title: 'Régénérer toute la semaine ?',
      message: 'Les repas verrouillés et déjà cuisinés sont conservés.',
      actions: [{ label: 'Régénérer', icon: 'refresh', variant: 'primary', onPress: () => router.push('/generating') }],
    });

  const snackMessage = snack ?? (previousPlan ? 'Repas remplacé, liste de courses mise à jour.' : null);

  return (
    <View style={styles.root}>
      <Screen bottomInset={72}>
        <AppText variant="display">{formatRange(plan.weekStart)}</AppText>

        {expired ? (
          <Card tone="accent">
            <AppText variant="bodyStrong">Cette semaine est terminée.</AppText>
            <Button label="Composer la semaine suivante" compact onPress={() => startNextWeek({ today })} />
          </Card>
        ) : null}
        {drift.length > 0 ? (
          <Card tone="accent">
            <AppText variant="bodyStrong">Votre profil a changé depuis la génération.</AppText>
            <AppText variant="caption" color="textMuted">
              {incompatible > 0 ? `${incompatible} repas ne correspondent plus à votre régime ou vos allergies.` : 'Régénérez pour appliquer le nouveau nombre de personnes.'}
            </AppText>
            <Button label="Régénérer les repas non verrouillés" compact variant="secondary" onPress={() => router.push('/generating')} />
          </Card>
        ) : null}
        {plan.unfilled.length > 0 ? (
          <Card tone="alt">
            <AppText variant="bodyStrong">{`${plan.unfilled.length} créneau${plan.unfilled.length > 1 ? 'x' : ''} sans recette compatible.`}</AppText>
            <AppText variant="caption" color="textMuted">
              Assouplissez le temps de cuisine ou les aversions dans le Profil.
            </AppText>
          </Card>
        ) : null}

        <View style={styles.tiles}>
          <StatTile label="Budget estimé" value={list ? formatPrice(list.totalPrice) : '—'} hint={`pour ${profile.persons} pers.`} />
          <StatTile label="À acheter" value={String(toBuy)} hint="articles" />
          <StatTile label="Anti-gaspi" value={list ? `${list.wasteScore} %` : '—'} hint={`équilibre ${balance}/100`} tone="success" />
        </View>
        <AppText variant="caption" color="textMuted">{`${cooked}/${plan.meals.length} repas cuisinés`}</AppText>

        {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((day) => {
          const meals = plan.meals.filter((m) => m.slot.day === day);
          if (meals.length === 0) return null;
          const date = parseISO(addDays(plan.weekStart, day));
          return (
            <View key={day} style={styles.day}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/day/[day]', params: { day: String(day) } })} style={styles.dayHeader}>
                <AppText variant="h2">{`${WEEKDAY_LABELS[day]} ${date.getDate()}`}</AppText>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  recipe={RECIPE_INDEX.get(meal.recipeId)}
                  showCalories={showCalories}
                  onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: meal.recipeId, mealId: meal.id } })}
                  onLongPress={() => onMealLongPress(meal.id)}
                />
              ))}
            </View>
          );
        })}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Régénérer la semaine"
        onPress={confirmRegenerate}
        style={[styles.fab, { backgroundColor: theme.accent }]}
      >
        <Ionicons name="refresh" size={26} color={theme.onPrimary} />
      </Pressable>
      <Snackbar
        message={snackMessage}
        action={!snack && previousPlan ? { label: 'Annuler', onPress: undoSwap } : undefined}
        onDismiss={() => {
          if (snack) setSnack(null);
          else if (previousPlan) dismissUndo();
        }}
      />
      <ActionSheet visible={sheet !== null} title={sheet?.title ?? ''} message={sheet?.message} actions={sheet?.actions ?? []} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  day: { gap: Spacing.sm },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
