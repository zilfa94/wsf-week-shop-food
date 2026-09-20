import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export interface StepperProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
  /** Libellé accessible de la valeur (« 2 personnes »). */
  readonly label: string;
  readonly unit?: string;
}

export function Stepper({ value, min, max, step = 1, onChange, label, unit }: StepperProps) {
  const theme = useTheme();
  const canDec = value - step >= min;
  const canInc = value + step <= max;
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <View style={[styles.row, { backgroundColor: theme.primary }]} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diminuer"
        accessibilityState={{ disabled: !canDec }}
        disabled={!canDec}
        onPress={() => onChange(round(value - step))}
        style={[styles.button, !canDec ? styles.disabled : null]}
      >
        <Ionicons name="remove" size={22} color={theme.onPrimary} />
      </Pressable>
      <AppText variant="h2" tabular color="onPrimary" style={styles.value}>
        {`${String(value).replace('.', ',')}${unit ? ` ${unit}` : ''}`}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Augmenter"
        accessibilityState={{ disabled: !canInc }}
        disabled={!canInc}
        onPress={() => onChange(round(value + step))}
        style={[styles.button, !canInc ? styles.disabled : null]}
      >
        <Ionicons name="add" size={22} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
  },
  button: { width: TouchTarget, height: TouchTarget, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  value: { minWidth: 64, textAlign: 'center' },
});
