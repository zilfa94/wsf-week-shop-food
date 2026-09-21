import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Chip, FoodImage } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { CUISINE_FAMILY_HINTS, cuisineFamily, selectableCuisines } from '@/core/cuisines';
import { CUISINE_LABELS } from '@/core/labels';
import type { Cuisine } from '@/core/types';
import { RECIPES } from '@/data/recipes';
import type { FoodImageKey } from '@/data/food-images';
import { useTheme, useThemeName } from '@/hooks/use-theme';

/** Plat emblématique de chaque famille pour l'illustrer (images de `assets/images/food/`). */
const CUISINE_IMAGE: Readonly<Partial<Record<Cuisine, FoodImageKey>>> = {
  french: 'pot_of_food',
  mediterranean: 'spaghetti',
  asian: 'steaming_bowl',
  oriental: 'falafel',
};

export interface CuisinePickerProps {
  readonly value: readonly Cuisine[];
  readonly onChange: (cuisines: Cuisine[]) => void;
}

/**
 * Cuisines aimées : tuiles illustrées à choix multiple. Aucune tuile choisie = toutes les cuisines.
 * Le nombre de plats de chaque famille est affiché pour que le choix reste honnête (une seule famille
 * ne suffit pas toujours à remplir la semaine : d'autres plats complètent alors).
 */
export function CuisinePicker({ value, onChange }: CuisinePickerProps) {
  const theme = useTheme();
  const dark = useThemeName() === 'dark';
  const choices = useMemo(() => selectableCuisines(RECIPES), []);
  const selected = new Set(value.map(cuisineFamily));
  const toggle = (c: Cuisine) => onChange(selected.has(c) ? [...selected].filter((x) => x !== c) : [...selected, c]);
  return (
    <View style={styles.block}>
      <View style={styles.grid}>
        {choices.map(({ cuisine, count }) => {
          const on = selected.has(cuisine);
          return (
            <Pressable
              key={cuisine}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${CUISINE_LABELS[cuisine]}, ${count} plats`}
              onPress={() => toggle(cuisine)}
              style={({ pressed }) => [
                styles.tile,
                !dark ? Shadow.card : null,
                { backgroundColor: on ? theme.primary : theme.surface, borderColor: theme.border, borderWidth: dark ? StyleSheet.hairlineWidth : 0 },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.tileHeader}>
                <FoodImage imageKey={CUISINE_IMAGE[cuisine]} size={52} tile="none" />
                {on ? <Ionicons name="checkmark-circle" size={22} color={theme.onPrimary} /> : null}
              </View>
              <AppText variant="bodyStrong" color={on ? 'onPrimary' : 'text'}>
                {CUISINE_LABELS[cuisine]}
              </AppText>
              <AppText variant="caption" color={on ? 'onPrimary' : 'textMuted'} numberOfLines={2}>
                {CUISINE_FAMILY_HINTS[cuisine] ?? ''}
              </AppText>
              <AppText variant="caption" color={on ? 'onPrimary' : 'textMuted'} tabular>
                {`${count} plats`}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Chip label="Toutes les cuisines" variant="filter" selected={selected.size === 0} onPress={() => onChange([])} icon={selected.size === 0 ? 'checkmark' : undefined} />
        <AppText variant="caption" color="textMuted" style={styles.note}>
          {selected.size === 0
            ? 'Sans choix, la semaine mélange toutes les cuisines.'
            : 'Vos cuisines passent en premier ; d’autres plats ne complètent que si elles ne suffisent pas à varier la semaine.'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { width: '48%', flexGrow: 1, borderRadius: Radius.card, padding: Spacing.md, gap: 2 },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  footer: { gap: Spacing.sm },
  note: { flexShrink: 1 },
});
