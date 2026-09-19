import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, Screen, Stepper } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { addDays } from '@/core/date';
import { AISLE_LABELS } from '@/core/labels';
import { formatQuantity } from '@/core/units';
import type { Ingredient } from '@/core/types';
import { INGREDIENTS } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { useToday } from '@/store/hooks';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Ajout au garde-manger : recherche locale, quantité par conditionnement, date limite déduite. */
export default function PantryAddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const upsert = useAppStore((s) => s.upsertPantryItem);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [packs, setPacks] = useState(1);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return INGREDIENTS.filter((i) => normalize(i.name).includes(q) || i.id.includes(q)).slice(0, 8);
  }, [query]);

  const quantity = selected ? packs * selected.packaging.size : 0;
  const add = () => {
    if (!selected) return;
    upsert({ ingredientId: selected.id, quantity, addedAt: today, expiresAt: addDays(today, selected.shelfLifeDays) });
    router.canGoBack() ? router.back() : router.replace('/(tabs)/pantry');
  };

  return (
    <Screen>
      <AppText variant="h1">Ajouter au garde-manger</AppText>
      <TextInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setSelected(null);
        }}
        placeholder="Rechercher un ingrédient (ex. riz, œuf…)"
        placeholderTextColor={theme.textMuted}
        autoFocus
        accessibilityLabel="Rechercher un ingrédient"
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
      />
      {!selected && results.length > 0 ? (
        <View style={styles.list}>
          {results.map((i) => (
            <Card key={i.id} onPress={() => setSelected(i)} accessibilityLabel={i.name} style={styles.result}>
              <AppText variant="bodyStrong">{i.name}</AppText>
              <AppText variant="caption" color="textMuted">{`${AISLE_LABELS[i.aisle]} · ${i.packaging.label}`}</AppText>
            </Card>
          ))}
        </View>
      ) : null}
      {!selected && query.trim().length >= 2 && results.length === 0 ? (
        <AppText color="textMuted">Aucun ingrédient trouvé.</AppText>
      ) : null}
      {selected ? (
        <Card tone="alt">
          <AppText variant="h2">{selected.name}</AppText>
          <AppText variant="caption" color="textMuted">{`Conditionnement : ${selected.packaging.label}`}</AppText>
          <Stepper value={packs} min={1} max={20} onChange={setPacks} label={`${packs} conditionnements`} />
          <AppText tabular>{`Soit ${formatQuantity(quantity, selected.canonicalUnit, selected)} · à consommer avant le ${addDays(today, selected.shelfLifeDays)}`}</AppText>
          <Button label="Ajouter" icon="add" onPress={add} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { ...Typography.body, borderWidth: 1, borderRadius: Radius.button, paddingHorizontal: Spacing.lg, minHeight: 52 },
  list: { gap: Spacing.sm },
  result: { paddingVertical: Spacing.md },
});
