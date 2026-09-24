import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CuisinePicker } from '@/components/profile/cuisine-picker';
import { DietPicker } from '@/components/profile/diet-picker';
import { MealPicker } from '@/components/profile/meal-picker';
import { PostalCodeField } from '@/components/profile/postal-code-field';
import { ActionSheet, AppText, Button, Card, Chip, Screen, SectionHeader, SegmentedControl, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_LABELS, GOAL_LABELS, ONBOARDING_ALLERGENS } from '@/core/labels';
import type { Allergen, Goal } from '@/core/types';
import { useAppStore } from '@/store';

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
  const router = useRouter();
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const toggleAllergen = (a: Allergen) =>
    setProfile({ allergens: profile.allergens.includes(a) ? profile.allergens.filter((x) => x !== a) : [...profile.allergens, a] });

  return (
    <Screen safeTop>
      <AppText variant="display">Profil</AppText>
      <SectionHeader title="Foyer" />
      <Stepper value={profile.persons} min={1} max={8} onChange={(persons) => setProfile({ persons })} label={`${profile.persons} personnes`} unit="pers." />
      <PostalCodeField value={settings.postalCode} onChange={(v) => setSetting('postalCode', v)} />
      <SectionHeader title="Repas planifiés" />
      <MealPicker value={profile} onChange={(patch) => setProfile(patch)} />

      <SectionHeader title="Régime" />
      <DietPicker diet={profile.diet} onChange={(diet) => setProfile({ diet })} compact />

      <SectionHeader title="Cuisines préférées" subtitle="La semaine est composée d’abord avec ces cuisines" />
      <CuisinePicker value={profile.preferredCuisines} onChange={(preferredCuisines) => setProfile({ preferredCuisines })} />

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

      <SectionHeader title="Temps en cuisine" subtitle="Optionnel : maximum par repas en semaine (90 min le week-end)" />
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
        <Chip label="Batch cooking (un dîner doublé pour le lendemain)" selected={profile.allowBatchCooking} onPress={() => setProfile({ allowBatchCooking: !profile.allowBatchCooking })} />
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
          Les prix de la liste sont indicatifs ; « Où acheter » (onglet Courses) n’affiche que des prix réellement relevés, avec leur enseigne et leur date. Les macros sont approximatives, par portion.
        </AppText>
      </Card>
      <Button label="Effacer toutes les données" variant="danger" onPress={() => setConfirmReset(true)} />
      <ActionSheet
        visible={confirmReset}
        title="Effacer toutes les données ?"
        message="Profil, semaine, courses et garde-manger seront supprimés."
        actions={[{ label: 'Effacer', variant: 'danger', icon: 'trash', onPress: () => {
            resetAll();
            router.replace('/onboarding');
          } }]}
        onClose={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
