import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, FoodImage, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AISLE_LABELS, MEAL_TYPE_LABELS, WEEKDAY_LABELS } from '@/core/labels';
import { packagingsOf } from '@/core/packaging';
import { formatPrice, formatQuantity } from '@/core/units';
import { useHaptics } from '@/hooks/use-haptics';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, RECIPE_INDEX, useShoppingList, useToday } from '@/store/hooks';

/** Détail d'un article de la liste : à acheter vs besoin réel, reste, recettes concernées, pack, « j'en ai déjà ». */
export default function ItemScreen() {
  const router = useRouter();
  const today = useToday();
  const haptics = useHaptics();
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  const plan = useAppStore((s) => s.currentPlan);
  const setPackChoice = useAppStore((s) => s.setPackChoice);
  const markHaveAlready = useAppStore((s) => s.markHaveAlready);
  const list = useShoppingList();
  const ing = INGREDIENT_INDEX.get(ingredientId ?? '');
  const item = list?.items.find((i) => i.ingredientId === ingredientId);

  if (!plan || !ing || !item) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Article introuvable" />
      </Screen>
    );
  }
  const options = packagingsOf(ing);
  const leftover = list?.leftovers.find((l) => l.ingredientId === ing.id);
  const reuse = leftover?.reusedByMealId ? plan.meals.find((m) => m.id === leftover.reusedByMealId) : undefined;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/shopping'));

  return (
    <Screen>
      <Stack.Screen options={{ title: ing.name }} />
      <View style={styles.hero}>
        <FoodImage ingredientId={ing.id} size={96} tile="accent" />
        <View style={styles.heroText}>
          <AppText variant="display">{ing.name}</AppText>
          <AppText color="textMuted">{AISLE_LABELS[ing.aisle]}</AppText>
        </View>
      </View>

      <Card tone="alt">
        <AppText variant="bodyStrong" tabular>{`À acheter : ${item.packs > 0 ? item.label : 'rien'} · ${formatPrice(item.price)}`}</AppText>
        <AppText variant="caption" color="textMuted" tabular>
          {`Besoin réel : ${formatQuantity(item.needed, ing.canonicalUnit, ing)}${item.fromPantry > 0 ? ` · ${formatQuantity(item.fromPantry, ing.canonicalUnit, ing)} pris dans le garde-manger` : ''}`}
        </AppText>
        {item.leftover > 0 ? (
          <AppText variant="caption" color={reuse ? 'accent' : 'textMuted'} tabular>
            {`Reste prévisible : ~${formatQuantity(item.leftover, ing.canonicalUnit, ing)}${reuse ? ` · réutilisé ${WEEKDAY_LABELS[reuse.slot.day].toLowerCase()}` : ing.freezable ? ' · se congèle' : ing.shelfLifeDays >= 60 ? ' · longue conservation' : ''}`}
          </AppText>
        ) : null}
      </Card>

      {options.length > 1 ? (
        <>
          <SectionHeader title="Conditionnement" />
          <SegmentedControl
            options={options.map((p, i) => ({ value: i, label: p.label }))}
            value={item.packagingIndex}
            onChange={(i) => setPackChoice(plan.id, ing.id, i)}
          />
        </>
      ) : null}

      <SectionHeader title="Utilisé dans" />
      <Card>
        {item.usedIn.map((u) => {
          const meal = plan.meals.find((m) => m.id === u.mealId);
          return (
            <View key={u.mealId} style={styles.row}>
              <AppText style={styles.grow}>{`${RECIPE_INDEX.get(u.recipeId)?.name ?? u.recipeId}`}</AppText>
              <AppText variant="caption" color="textMuted" tabular>
                {meal ? `${WEEKDAY_LABELS[meal.slot.day]} · ${MEAL_TYPE_LABELS[meal.slot.type].toLowerCase()} · ` : ''}
                {formatQuantity(u.quantity, ing.canonicalUnit, ing)}
              </AppText>
            </View>
          );
        })}
      </Card>

      {leftover && leftover.recipes.length > 0 ? (
        <>
          <SectionHeader title="Pour utiliser le reste" subtitle="recettes hors plan" />
          <View style={styles.rowWrap}>
            {leftover.recipes.map((r) => (
              <Button key={r.recipeId} label={RECIPE_INDEX.get(r.recipeId)?.name ?? r.recipeId} variant="secondary" compact onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.recipeId } })} />
            ))}
          </View>
        </>
      ) : null}

      <Button
        label="J’en ai déjà"
        icon="home"
        variant="secondary"
        onPress={() => {
          markHaveAlready(ing.id, item.needed, today);
          haptics.success();
          close();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroText: { flex: 1, gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  grow: { flex: 1 },
});
