import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, AppText, Button, Card, Chip, Screen, SectionHeader, SegmentedControl, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_LABELS, DIET_LABELS, GOAL_LABELS, ONBOARDING_ALLERGENS } from '@/core/labels';
import type { Allergen, Diet, Goal } from '@/core/types';
import { useAppStore } from '@/store';

const DIETS: readonly Diet[] = ['omnivore', 'vegetarian', 'vegan', 'no_pork', 'pescatarian'];
const GOALS: readonly Goal[] = ['balance', 'weight_loss', 'muscle_gain', 'budget'];
const THEMES = [
  { value: 'system' as const, label: 'Système' },
  { value: 'light' as const, label: 'Clair' },
  { value: 'dark' as const, label: 'Sombre' },
];

/** Profil et réglages : toutes les réponses de l'onboarding restent modifiables ici. */
export default function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const toggleAllergen = (a: Allergen) =>
    setProfile({ allergens: profile.allergens.includes(a) ? profile.allergens.filter((x) => x !== a) : [...profile.allergens, a] });

  return (
    <Screen>
      <SectionHeader title="Foyer" />
      <Stepper value={profile.persons} min={1} max={8} onChange={(persons) => setProfile({ persons })} label={`${profile.persons} personnes`} unit="pers." />

      <SectionHeader title="Régime" />
      <View style={styles.wrap}>
        {DIETS.map((d) => (
          <Chip key={d} label={DIET_LABELS[d]} variant="filter" selected={profile.diet === d} onPress={() => setProfile({ diet: d })} />
        ))}
      </View>

      <SectionHeader title="Allergies et intolérances" />
      <View style={styles.wrap}>
        {ONBOARDING_ALLERGENS.map((a) => (
          <Chip key={a} label={ALLERGEN_LABELS[a]} variant="allergen" selected={profile.allergens.includes(a)} onPress={() => toggleAllergen(a)} />
        ))}
      </View>

      <SectionHeader title="Objectif" />
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <Chip key={g} label={GOAL_LABELS[g]} variant="filter" selected={profile.goal === g} onPress={() => setProfile({ goal: g })} />
        ))}
      </View>

      <SectionHeader title="Temps en cuisine" subtitle="Maximum par repas en semaine" />
      <SegmentedControl
        options={[
          { value: 15, label: '15 min' },
          { value: 30, label: '30 min' },
          { value: 45, label: '45 min' },
          { value: 90, label: 'Libre' },
        ]}
        value={profile.maxCookMinWeekday}
        onChange={(maxCookMinWeekday) => setProfile({ maxCookMinWeekday })}
      />
      <View style={styles.wrap}>
        <Chip label="Petit-déjeuner" selected={profile.includeBreakfast} onPress={() => setProfile({ includeBreakfast: !profile.includeBreakfast })} />
        <Chip label="Collation" selected={profile.includeSnack} onPress={() => setProfile({ includeSnack: !profile.includeSnack })} />
        <Chip label="Batch cooking" selected={profile.allowBatchCooking} onPress={() => setProfile({ allowBatchCooking: !profile.allowBatchCooking })} />
        <Chip label="Sel, poivre, huile supposés présents" selected={profile.assumeStaples} onPress={() => setProfile({ assumeStaples: !profile.assumeStaples })} />
      </View>

      <SectionHeader title="Application" />
      <SegmentedControl options={THEMES} value={settings.themeMode} onChange={(themeMode) => setSetting('themeMode', themeMode)} />
      <View style={styles.wrap}>
        <Chip label="Afficher les calories" selected={settings.showCalories} onPress={() => setSetting('showCalories', !settings.showCalories)} />
        <Chip label="Retour haptique" selected={settings.hapticsEnabled} onPress={() => setSetting('hapticsEnabled', !settings.hapticsEnabled)} />
      </View>

      <Card tone="alt">
        <AppText variant="caption" color="textMuted">
          Les prix sont indicatifs et varient selon le magasin. Les macros sont approximatives, par portion.
        </AppText>
      </Card>
      <Button label="Effacer toutes les données" variant="danger" onPress={() => setConfirmReset(true)} />
      <ActionSheet
        visible={confirmReset}
        title="Effacer toutes les données ?"
        message="Profil, semaine, courses et garde-manger seront supprimés."
        actions={[{ label: 'Effacer', variant: 'danger', icon: 'trash', onPress: resetAll }]}
        onClose={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
