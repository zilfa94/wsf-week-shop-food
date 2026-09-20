import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Checkbox, EmptyState, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { AISLE_LABELS } from '@/core/labels';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useShoppingList } from '@/store/hooks';

/** Mode magasin : un rayon à la fois, grande police, cochés en bas. */
export default function StoreModeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const list = useShoppingList();
  const plan = useAppStore((s) => s.currentPlan);
  const toggleChecked = useAppStore((s) => s.toggleChecked);
  const toggleManual = useAppStore((s) => s.toggleManualItem);
  const [index, setIndex] = useState(0);
  const sections = list?.sections ?? [];
  const section = sections[index];
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/shopping'));

  if (!plan || !section) {
    return (
      <Screen>
        <EmptyState icon="cart-outline" title="Rien à acheter" cta={{ label: 'Quitter', onPress: exit }} />
      </Screen>
    );
  }
  const rows = [
    ...section.items.map((i) => ({ key: i.ingredientId, label: `${INGREDIENT_INDEX.get(i.ingredientId)?.name ?? i.ingredientId} — ${i.label}`, checked: i.checked, toggle: () => toggleChecked(plan.id, i.ingredientId) })),
    ...section.manualItems.map((m) => ({ key: m.id, label: m.label, checked: m.checked, toggle: () => toggleManual(plan.id, m.id) })),
  ].sort((a, b) => Number(a.checked) - Number(b.checked));

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="caption" color="textMuted">{`Rayon ${index + 1}/${sections.length}`}</AppText>
          <Button label="Quitter" icon="close" variant="ghost" compact onPress={exit} accessibilityLabel="Quitter le mode magasin" />
        </View>
        <AppText variant="display">{AISLE_LABELS[section.aisle]}</AppText>
      </View>
      {rows.map((r) => (
        <Pressable
          key={r.key}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: r.checked }}
          accessibilityLabel={r.label}
          onPress={() => {
            r.toggle();
            haptics.tap();
          }}
          style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }, r.checked ? styles.checked : null]}
        >
          <Checkbox checked={r.checked} onToggle={r.toggle} accessibilityLabel={r.label} />
          <AppText variant="h2" style={styles.grow}>
            {r.label}
          </AppText>
        </Pressable>
      ))}
      <View style={styles.actions}>
        <Button label="Rayon précédent" variant="ghost" disabled={index === 0} onPress={() => setIndex(index - 1)} />
        {index < sections.length - 1 ? (
          <Button label="Rayon suivant" icon="arrow-forward" onPress={() => setIndex(index + 1)} />
        ) : (
          <Button label="Terminer" icon="checkmark" onPress={exit} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, paddingVertical: Spacing.sm, paddingRight: Spacing.lg },
  checked: { opacity: 0.45 },
  grow: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.lg },
});
