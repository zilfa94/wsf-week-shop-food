import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedControlProps<T extends string | number> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected ? { backgroundColor: theme.primary } : null]}
          >
            <AppText variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'onPrimary' : 'textMuted'} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: Radius.button, padding: Spacing.xs, gap: Spacing.xs },
  segment: {
    flex: 1,
    minHeight: TouchTarget - 8,
    borderRadius: Radius.button - 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});
