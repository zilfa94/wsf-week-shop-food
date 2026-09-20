import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, FoodImage, Screen, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatQuantity } from '@/core/units';
import { formatDayMonth } from '@/core/date';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, usePantryAlerts, useToday } from '@/store/hooks';

/** Garde-manger : stock déclaré, alertes de péremption. L'ajout manuel arrive avec l'écran `pantry-add`. */
export default function PantryScreen() {
  const router = useRouter();
  const today = useToday();
  const pantry = useAppStore((s) => s.pantry);
  const remove = useAppStore((s) => s.removePantryItem);
  const alerts = usePantryAlerts(today);

  if (pantry.length === 0) {
    return (
      <Screen>
        <EmptyState icon="file-tray-stacked-outline" title="Garde-manger vide" body="Ajoutez ce que vous avez : on le déduira de vos courses. Les articles cochés après les courses y entrent en un tap." cta={{ label: 'Ajouter un ingrédient', onPress: () => router.push('/pantry-add') }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader title={`${pantry.length} ligne${pantry.length > 1 ? 's' : ''} en stock`} subtitle={alerts.length > 0 ? `${alerts.length} à consommer rapidement` : undefined} right={<Button label="Ajouter" icon="add" compact onPress={() => router.push('/pantry-add')} />} />
      <Button label="Cuisiner avec ce que j’ai" icon="restaurant-outline" variant="secondary" onPress={() => router.push('/cook-with')} />
      {pantry.map((p) => {
        const ing = INGREDIENT_INDEX.get(p.ingredientId);
        const soon = alerts.includes(p);
        return (
          <Card key={`${p.ingredientId}-${p.addedAt}`} style={styles.row}>
            <FoodImage ingredientId={p.ingredientId} size={48} tile={soon ? 'accent' : 'soft'} />
            <View style={styles.texts}>
              <AppText variant="bodyStrong">{ing?.name ?? p.ingredientId}</AppText>
              <AppText variant="caption" color={soon ? 'danger' : 'textMuted'} tabular>
                {`${ing ? formatQuantity(p.quantity, ing.canonicalUnit, ing) : p.quantity}${p.expiresAt ? ` · ${soon ? 'périme le' : 'jusqu’au'} ${formatDayMonth(p.expiresAt)}` : ''}`}
              </AppText>
            </View>
            <Button label="Retirer" variant="ghost" compact onPress={() => remove(p.ingredientId, p.addedAt)} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  texts: { flex: 1, gap: 2 },
});
