import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, Checkbox, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AISLE_LABELS, WEEKDAY_SHORT_LABELS } from '@/core/labels';
import { formatPrice, formatQuantity } from '@/core/units';
import { useHaptics } from '@/hooks/use-haptics';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useShoppingList } from '@/store/hooks';

export default function ShoppingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const list = useShoppingList();
  const plan = useAppStore((s) => s.currentPlan);
  const toggleChecked = useAppStore((s) => s.toggleChecked);
  const toggleManual = useAppStore((s) => s.toggleManualItem);

  if (!plan || !list) {
    return (
      <Screen>
        <EmptyState icon="cart-outline" title="Votre liste est vide" body="Composez d’abord votre semaine : la liste se calcule toute seule." cta={{ label: 'Composer ma semaine', onPress: () => router.push('/generating') }} />
      </Screen>
    );
  }

  const toBuy = list.items.filter((i) => i.packs > 0);
  const done = toBuy.filter((i) => i.checked).length;
  if (toBuy.length === 0 && list.manualItems.length === 0) {
    return (
      <Screen>
        <EmptyState icon="checkmark-done-circle-outline" title="Vous avez déjà tout !" body="Rien à acheter cette semaine : le garde-manger couvre tous les repas." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader title={`${toBuy.length} articles · ${formatPrice(list.totalPrice)}`} subtitle={`${done}/${toBuy.length} cochés · score anti-gaspi ${list.wasteScore} % · reste à risque ${formatPrice(list.totalLeftoverValue)}`} />
      {list.sections.map((section) => (
        <View key={section.aisle} style={styles.section}>
          <AppText variant="h2">{AISLE_LABELS[section.aisle]}</AppText>
          {section.items.map((item) => {
            const ing = INGREDIENT_INDEX.get(item.ingredientId)!;
            const leftover = list.leftovers.find((l) => l.ingredientId === item.ingredientId);
            const reuse = leftover?.reusedByMealId ? plan.meals.find((m) => m.id === leftover.reusedByMealId) : undefined;
            return (
              <Card key={item.ingredientId} style={[styles.row, item.checked ? styles.checked : null]} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.usedIn[0]?.recipeId ?? '' } })}>
                <Checkbox
                  checked={item.checked}
                  onToggle={() => {
                    toggleChecked(plan.id, item.ingredientId);
                    haptics.tap();
                  }}
                  accessibilityLabel={`${ing.name}, ${item.label}, ${item.checked ? 'coché' : 'non coché'}`}
                />
                <View style={styles.texts}>
                  <AppText variant="bodyStrong">{`${ing.name} — ${item.label}`}</AppText>
                  <AppText variant="caption" color="textMuted" tabular>
                    {`Besoin réel : ${formatQuantity(item.needed, ing.canonicalUnit, ing)}${item.fromPantry > 0 ? ` (dont ${formatQuantity(item.fromPantry, ing.canonicalUnit, ing)} du garde-manger)` : ''}${item.leftover > 0 ? ` · reste ~${formatQuantity(item.leftover, ing.canonicalUnit, ing)}` : ''}`}
                  </AppText>
                  {reuse ? (
                    <AppText variant="caption" color="accent">
                      {`♻ Reste réutilisé ${WEEKDAY_SHORT_LABELS[reuse.slot.day]}`}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="bodyStrong" tabular>
                  {formatPrice(item.price)}
                </AppText>
              </Card>
            );
          })}
          {section.manualItems.map((m) => (
            <Card key={m.id} style={[styles.row, m.checked ? styles.checked : null]}>
              <Checkbox checked={m.checked} onToggle={() => toggleManual(plan.id, m.id)} accessibilityLabel={`${m.label}, ${m.checked ? 'coché' : 'non coché'}`} />
              <View style={styles.texts}>
                <AppText variant="bodyStrong">{m.label}</AppText>
              </View>
              <AppText variant="caption" color="textMuted">
                {m.price !== undefined ? formatPrice(m.price) : 'Prix inconnu'}
              </AppText>
            </Card>
          ))}
        </View>
      ))}
      {list.staplesToCheck.length > 0 ? (
        <Card tone="alt">
          <AppText variant="bodyStrong">À vérifier dans vos placards</AppText>
          <AppText variant="caption" color="textMuted">
            {list.staplesToCheck.map((id) => INGREDIENT_INDEX.get(id)?.name ?? id).join(', ')}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingLeft: Spacing.xs },
  checked: { opacity: 0.55 },
  texts: { flex: 1, gap: 2 },
});
