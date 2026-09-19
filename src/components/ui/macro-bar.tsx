import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Macros } from '@/core/types';
import { AppText } from './app-text';

export interface MacroBarProps {
  readonly macros: Macros;
  readonly showCalories?: boolean;
}

/** Barre segmentée protéines / glucides / lipides (part des kcal) avec légende. */
export function MacroBar({ macros, showCalories = true }: MacroBarProps) {
  const theme = useTheme();
  const p = macros.protein * 4;
  const c = macros.carbs * 4;
  const f = macros.fat * 9;
  const total = Math.max(1, p + c + f);
  const segments = [
    { key: 'P', label: 'Protéines', grams: macros.protein, share: p / total, color: theme.protein },
    { key: 'G', label: 'Glucides', grams: macros.carbs, share: c / total, color: theme.carbs },
    { key: 'L', label: 'Lipides', grams: macros.fat, share: f / total, color: theme.fat },
  ];
  return (
    <View style={styles.root} accessibilityLabel={`${Math.round(macros.kcal)} kcal, ${segments.map((s) => `${s.label} ${Math.round(s.grams)} g`).join(', ')}`}>
      <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
        {segments.map((s) => (
          <View key={s.key} style={{ flex: Math.max(0.02, s.share), backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {showCalories ? (
          <AppText variant="caption" tabular>
            {`${Math.round(macros.kcal)} kcal`}
          </AppText>
        ) : null}
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <AppText variant="caption" color="textMuted" tabular>
              {`${s.key} ${Math.round(s.grams)} g`}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.xs },
  bar: { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
