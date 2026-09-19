import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, StatTile } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatPrice, formatQuantity } from '@/core/units';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useToday, useWeekReport } from '@/store/hooks';

/** Bilan de la semaine : repas cuisinés, scores, restes orphelins, économie réalisée. */
export default function ReportScreen() {
  const router = useRouter();
  const today = useToday();
  const report = useWeekReport();
  const startNextWeek = useAppStore((s) => s.startNextWeek);

  if (!report) {
    return (
      <Screen>
        <EmptyState icon="stats-chart-outline" title="Pas encore de semaine à évaluer" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">Bilan de la semaine</AppText>
      <View style={styles.tiles}>
        <StatTile label="Repas cuisinés" value={`${report.cookedMeals}/${report.totalMeals}`} />
        <StatTile label="Anti-gaspi" value={`${report.wasteScore} %`} tone="success" />
        <StatTile label="Équilibre" value={`${report.balanceScore}/100`} />
      </View>
      <Card tone="accent">
        <AppText variant="bodyStrong" tabular>{`≈ ${formatPrice(report.savedEur)} économisés grâce aux ingrédients partagés entre plats.`}</AppText>
      </Card>
      <Card>
        <AppText variant="h2">Restes sans réemploi prévu</AppText>
        {report.orphanLeftovers.length === 0 ? (
          <AppText color="textMuted">Aucun : chaque reste est réutilisé dans la semaine.</AppText>
        ) : (
          report.orphanLeftovers.map((o) => {
            const ing = INGREDIENT_INDEX.get(o.ingredientId);
            return (
              <AppText key={o.ingredientId} tabular>
                {`• ${ing?.name ?? o.ingredientId} : ~${ing ? formatQuantity(o.quantity, ing.canonicalUnit, ing) : o.quantity}${ing?.freezable ? ' (se congèle)' : ''}`}
              </AppText>
            );
          })
        )}
      </Card>
      <Button
        label="Composer la semaine suivante"
        icon="arrow-forward"
        onPress={() => {
          startNextWeek({ today });
          router.replace('/(tabs)');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.sm },
});
