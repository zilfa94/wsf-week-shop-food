import { StyleSheet, View } from 'react-native';
import { AppText, Card, Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { DIET_LABELS } from '@/core/labels';
import type { Diet } from '@/core/types';

/** Régimes de base ; « sans porc » est une restriction posée par-dessus l'omnivore (`no_pork`). */
const BASES: readonly Diet[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian'];

export function baseDiet(diet: Diet): Diet {
  return diet === 'no_pork' ? 'omnivore' : diet;
}

export interface DietPickerProps {
  readonly diet: Diet;
  readonly onChange: (diet: Diet) => void;
  /** Cartes (onboarding) ou puces compactes (profil). */
  readonly compact?: boolean;
}

export function DietPicker({ diet, onChange, compact = false }: DietPickerProps) {
  const base = baseDiet(diet);
  const noPork = diet === 'no_pork';
  const selectBase = (b: Diet) => onChange(b === 'omnivore' && noPork ? 'no_pork' : b);
  const togglePork = () => onChange(noPork ? 'omnivore' : 'no_pork');
  return (
    <View style={styles.block}>
      {compact ? (
        <View style={styles.wrap}>
          {BASES.map((b) => (
            <Chip key={b} label={DIET_LABELS[b]} variant="filter" selected={base === b} onPress={() => selectBase(b)} />
          ))}
        </View>
      ) : (
        BASES.map((b) => (
          <Card key={b} tone={base === b ? 'accent' : 'surface'} onPress={() => selectBase(b)} accessibilityLabel={DIET_LABELS[b]}>
            <AppText variant="bodyStrong">{DIET_LABELS[b]}</AppText>
          </Card>
        ))
      )}
      <View style={styles.wrap}>
        <Chip label={DIET_LABELS.no_pork} variant="filter" icon={noPork ? 'checkmark' : undefined} selected={noPork} onPress={base === 'omnivore' ? togglePork : undefined} />
        {base !== 'omnivore' ? (
          <AppText variant="caption" color="textMuted">
            {`Déjà sans porc : ${DIET_LABELS[base].toLowerCase()}.`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
});
