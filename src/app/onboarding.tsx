import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Chip, Screen, SegmentedControl, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ALLERGEN_LABELS, DIET_LABELS, GOAL_LABELS, ONBOARDING_ALLERGENS } from '@/core/labels';
import type { Allergen, Diet, Goal, IngredientId } from '@/core/types';
import { INGREDIENTS } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';

const DIETS: readonly Diet[] = ['omnivore', 'vegetarian', 'vegan', 'no_pork', 'pescatarian'];
const GOALS: readonly { value: Goal; hint: string }[] = [
  { value: 'balance', hint: '≈ 2 000 kcal/j' },
  { value: 'weight_loss', hint: '≈ 1 700 kcal/j' },
  { value: 'muscle_gain', hint: '≈ 2 400 kcal/j, protéines ↑' },
  { value: 'budget', hint: 'Coût des courses minimisé' },
];
const TIMES = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 90, label: 'Peu importe' },
];
const DISLIKE_SUGGESTIONS: readonly IngredientId[] = [
  'coriandre', 'champignon', 'aubergine', 'betterave', 'epinard', 'poisson_note', 'chou_fleur', 'olives', 'piment_en_poudre', 'celeri_branche', 'brocoli', 'moules',
].filter((id) => INGREDIENTS.some((i) => i.id === id));

const STEPS = ['Bienvenue', 'Pour qui cuisinez-vous ?', 'Votre régime', 'Allergies et intolérances', 'Votre objectif', 'Temps en cuisine', 'Ce que vous n’aimez pas'];

/** Onboarding en 6 étapes sur un seul écran (docs/SPEC.md § 1.2). */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;

  const toggle = <T,>(list: readonly T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const finish = () => {
    completeOnboarding();
    router.replace('/generating');
  };

  return (
    <Screen>
      <View style={styles.progress} accessibilityLabel={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? theme.primary : theme.border }]} />
        ))}
      </View>
      <AppText variant="display">{STEPS[step]}</AppText>

      {step === 0 && (
        <View style={styles.block}>
          <Ionicons name="basket" size={64} color={theme.primary} />
          <AppText>7 jours de vrais plats · Une liste de courses exacte · Rien ne finit à la poubelle.</AppText>
          <AppText color="textMuted">Tout se passe sur votre téléphone, sans compte ni connexion.</AppText>
        </View>
      )}

      {step === 1 && (
        <View style={styles.block}>
          <Stepper value={profile.persons} min={1} max={8} onChange={(persons) => setProfile({ persons })} label={`${profile.persons} personnes`} unit={profile.persons > 1 ? 'pers.' : 'pers.'} />
          <AppText color="textMuted">Les quantités et la liste de courses s’adaptent au nombre de personnes.</AppText>
        </View>
      )}

      {step === 2 && (
        <View style={styles.block}>
          {DIETS.map((d) => (
            <Card key={d} tone={profile.diet === d ? 'accent' : 'surface'} onPress={() => setProfile({ diet: d })} accessibilityLabel={DIET_LABELS[d]}>
              <AppText variant="bodyStrong">{DIET_LABELS[d]}</AppText>
            </Card>
          ))}
        </View>
      )}

      {step === 3 && (
        <View style={styles.block}>
          <View style={styles.wrap}>
            <Chip label="Aucune" selected={profile.allergens.length === 0} onPress={() => setProfile({ allergens: [] })} />
            {ONBOARDING_ALLERGENS.map((a: Allergen) => (
              <Chip key={a} label={ALLERGEN_LABELS[a]} variant="allergen" selected={profile.allergens.includes(a)} onPress={() => setProfile({ allergens: toggle(profile.allergens, a) })} />
            ))}
          </View>
          <AppText color="textMuted">Les recettes contenant ces allergènes seront exclues ; un ingrédient facultatif sera simplement retiré.</AppText>
        </View>
      )}

      {step === 4 && (
        <View style={styles.block}>
          {GOALS.map((g) => (
            <Card key={g.value} tone={profile.goal === g.value ? 'accent' : 'surface'} onPress={() => setProfile({ goal: g.value })} accessibilityLabel={GOAL_LABELS[g.value]}>
              <AppText variant="bodyStrong">{GOAL_LABELS[g.value]}</AppText>
              <AppText variant="caption" color="textMuted">
                {g.hint}
              </AppText>
            </Card>
          ))}
        </View>
      )}

      {step === 5 && (
        <View style={styles.block}>
          <AppText>En semaine, combien de temps maximum par repas ?</AppText>
          <SegmentedControl options={TIMES} value={profile.maxCookMinWeekday} onChange={(maxCookMinWeekday) => setProfile({ maxCookMinWeekday })} />
          <View style={styles.wrap}>
            <Chip label="Le week-end je cuisine plus longtemps" selected={profile.maxCookMinWeekend > profile.maxCookMinWeekday} onPress={() => setProfile({ maxCookMinWeekend: profile.maxCookMinWeekend > profile.maxCookMinWeekday ? profile.maxCookMinWeekday : 90 })} />
            <Chip label="Petit-déjeuner" selected={profile.includeBreakfast} onPress={() => setProfile({ includeBreakfast: !profile.includeBreakfast })} />
            <Chip label="Collation" selected={profile.includeSnack} onPress={() => setProfile({ includeSnack: !profile.includeSnack })} />
            <Chip label="Batch cooking (un dîner doublé pour le lendemain)" selected={profile.allowBatchCooking} onPress={() => setProfile({ allowBatchCooking: !profile.allowBatchCooking })} />
          </View>
        </View>
      )}

      {step === 6 && (
        <View style={styles.block}>
          <AppText>On évitera ces ingrédients :</AppText>
          <View style={styles.wrap}>
            {DISLIKE_SUGGESTIONS.map((id) => (
              <Chip key={id} label={INGREDIENTS.find((i) => i.id === id)!.name} selected={profile.dislikedIngredientIds.includes(id)} onPress={() => setProfile({ dislikedIngredientIds: toggle(profile.dislikedIngredientIds, id) })} />
            ))}
          </View>
          <AppText color="textMuted">Vous pourrez en ajouter d’autres depuis l’onglet Profil.</AppText>
        </View>
      )}

      <View style={styles.actions}>
        {step > 0 ? <Button label="Retour" variant="ghost" onPress={() => setStep(step - 1)} /> : <View />}
        <Button label={step === 0 ? 'Commencer' : step === last ? 'Composer ma semaine' : 'Continuer'} onPress={() => (step === last ? finish() : setStep(step + 1))} icon={step === last ? 'sparkles' : undefined} />
      </View>
      {step >= 2 && step < last ? <Button label="Passer les étapes restantes" variant="ghost" compact onPress={finish} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: Spacing.sm },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  block: { gap: Spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, gap: Spacing.md },
});
