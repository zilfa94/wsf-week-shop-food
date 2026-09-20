import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, Checkbox, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { AISLE_LABELS, WEEKDAY_SHORT_LABELS } from '@/core/labels';
import { formatPrice, formatQuantity } from '@/core/units';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useShoppingList, useToday } from '@/store/hooks';

export default function ShoppingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const today = useToday();
  const haptics = useHaptics();
  const list = useShoppingList();
  const plan = useAppStore((s) => s.currentPlan);
  const toggleChecked = useAppStore((s) => s.toggleChecked);
  const toggleManual = useAppStore((s) => s.toggleManualItem);
  const addManualItem = useAppStore((s) => s.addManualItem);
  const commitPurchases = useAppStore((s) => s.commitPurchasesToPantry);
  const [newItem, setNewItem] = useState('');

  if (!plan || !list) {
    return (
      <Screen>
        <EmptyState icon="cart-outline" title="Votre liste est vide" body="Composez d’abord votre semaine : la liste se calcule toute seule." cta={{ label: 'Composer ma semaine', onPress: () => router.push('/generating') }} />
      </Screen>
    );
  }

  const toBuy = list.items.filter((i) => i.packs > 0);
  const done = toBuy.filter((i) => i.checked).length;
  const submitManual = () => {
    const label = newItem.trim();
    if (!label) return;
    addManualItem(plan.id, { label, aisle: 'other' });
    setNewItem('');
  };
  if (toBuy.length === 0 && list.manualItems.length === 0) {
    return (
      <Screen>
        <EmptyState icon="checkmark-done-circle-outline" title="Vous avez déjà tout !" body="Rien à acheter cette semaine : le garde-manger couvre tous les repas." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader
        title={`${toBuy.length} articles · ${formatPrice(list.totalPrice)}`}
        subtitle={`${done}/${toBuy.length} cochés · score anti-gaspi ${list.wasteScore} % · reste à risque ${formatPrice(list.totalLeftoverValue)}`}
        right={<Button label="Magasin" icon="storefront-outline" variant="secondary" compact onPress={() => router.push('/store-mode')} />}
      />
      <Button label="Où acheter ? Comparer les prix relevés" icon="pricetags-outline" variant="secondary" compact onPress={() => router.push('/where-to-buy')} />
      {list.sections.map((section) => (
        <View key={section.aisle} style={styles.section}>
          <AppText variant="h2">{AISLE_LABELS[section.aisle]}</AppText>
          {section.items.map((item) => {
            const ing = INGREDIENT_INDEX.get(item.ingredientId)!;
            const leftover = list.leftovers.find((l) => l.ingredientId === item.ingredientId);
            const reuse = leftover?.reusedByMealId ? plan.meals.find((m) => m.id === leftover.reusedByMealId) : undefined;
            return (
              <Card key={item.ingredientId} style={[styles.row, item.checked ? styles.checked : null]} onPress={() => router.push({ pathname: '/item/[ingredientId]', params: { ingredientId: item.ingredientId } })}>
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
      <View style={styles.addRow}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Ajouter un article libre (ex. papier alu)"
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Article libre"
          onSubmitEditing={() => submitManual()}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
        />
        <Button label="Ajouter" compact onPress={submitManual} disabled={newItem.trim().length === 0} />
      </View>
      {done > 0 ? (
        <Button
          label={`Mettre les ${done} article${done > 1 ? 's' : ''} coché${done > 1 ? 's' : ''} au garde-manger`}
          icon="file-tray-stacked-outline"
          variant="secondary"
          onPress={() => {
            commitPurchases(today);
            haptics.success();
          }}
        />
      ) : null}
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
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: { ...Typography.body, flex: 1, borderWidth: 1, borderRadius: Radius.button, paddingHorizontal: Spacing.lg, minHeight: 44 },
});
