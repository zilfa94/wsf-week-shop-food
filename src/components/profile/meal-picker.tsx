import { StyleSheet, View } from 'react-native';
import { AppText, Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { MEAL_TYPE_LABELS } from '@/core/labels';
import type { MealFlags } from '@/core/filter';

export interface MealPickerProps {
  readonly value: MealFlags;
  readonly onChange: (patch: Partial<MealFlags>) => void;
}

/** Repas de la journée à planifier : petit-déjeuner, déjeuner, dîner (au moins un), collation en option. */
export function MealPicker({ value, onChange }: MealPickerProps) {
  const mains = [value.includeBreakfast, value.includeLunch, value.includeDinner].filter(Boolean).length;
  const toggle = (key: keyof MealFlags) => {
    const isMain = key !== 'includeSnack';
    if (isMain && value[key] && mains === 1) return; // au moins un repas principal
    onChange({ [key]: !value[key] });
  };
  return (
    <View style={styles.block}>
      <View style={styles.wrap}>
        <Chip label={MEAL_TYPE_LABELS.breakfast} variant="filter" selected={value.includeBreakfast} onPress={() => toggle('includeBreakfast')} />
        <Chip label={MEAL_TYPE_LABELS.lunch} variant="filter" selected={value.includeLunch} onPress={() => toggle('includeLunch')} />
        <Chip label={MEAL_TYPE_LABELS.dinner} variant="filter" selected={value.includeDinner} onPress={() => toggle('includeDinner')} />
        <Chip label={MEAL_TYPE_LABELS.snack} variant="filter" selected={value.includeSnack} onPress={() => toggle('includeSnack')} />
      </View>
      <AppText variant="caption" color="textMuted">
        {mains === 1 ? 'Un seul repas par jour : la liste de courses ne couvrira que celui-là.' : 'Décochez les repas que vous ne prenez pas.'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
