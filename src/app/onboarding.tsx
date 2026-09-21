import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CuisinePicker } from '@/components/profile/cuisine-picker';
import { DietPicker } from '@/components/profile/diet-picker';
import { MealPicker } from '@/components/profile/meal-picker';
import { PostalCodeField } from '@/components/profile/postal-code-field';
import { AppText, Button, Card, Chip, FoodImage, Screen, Stepper } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ALLERGEN_LABELS, GOAL_LABELS, ONBOARDING_ALLERGENS } from '@/core/labels';
import type { Allergen, Goal, IngredientId } from '@/core/types';
import { INGREDIENTS } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';

const GOALS: readonly { value: Goal; hint: string }[] = [
  { value: 'balance', hint: '≈ 2 000 kcal/j' },
  { value: 'weight_loss', hint: '≈ 1 700 kcal/j' },
  { value: 'muscle_gain', hint: '≈ 2 400 kcal/j, protéines ↑' },
  { value: 'budget', hint: 'Coût des courses minimisé' },
];
const DISLIKE_SUGGESTIONS: readonly IngredientId[] = [
  'coriandre', 'champignon', 'aubergine', 'betterave', 'epinard', 'chou_fleur', 'olives', 'piment_en_poudre', 'celeri_branche', 'brocoli', 'moules', 'poivron',
].filter((id) => INGREDIENTS.some((i) => i.id === id));

const STEPS = ['Bienvenue', 'Votre foyer', 'Votre régime', 'Vos cuisines préférées', 'Allergies et intolérances', 'Votre objectif', 'Ce que vous n’aimez pas'];

/** Onboarding en 5 étapes sur un seul écran (docs/SPEC.md § 1.2). Le temps de cuisine se règle dans le Profil. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const postalCode = useAppStore((s) => s.settings.postalCode);
  const setSetting = useAppStore((s) => s.setSetting);
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
        <View style={styles.welcome}>
          {/* Écran d'accueil du modèle : grand plat détouré, texte court, bouton jaune. */}
          <View style={styles.dishes}>
            <FoodImage recipeId="pates_tomate_mozzarella_basilic" size={150} tile="none" />
            <FoodImage recipeId="salade_grecque_feta" size={110} tile="none" style={styles.dishSide} />
          </View>
          <AppText variant="h1" style={styles.center}>7 jours de vrais plats, une liste de courses exacte.</AppText>
          <AppText color="textMuted" style={styles.center}>Rien ne finit à la poubelle. Tout se passe sur votre téléphone, sans compte.</AppText>
        </View>
      )}

      {step === 1 && (
        <View style={styles.block}>
          <AppText variant="h2">Pour combien de personnes ?</AppText>
          <Stepper value={profile.persons} min={1} max={8} onChange={(persons) => setProfile({ persons })} label={`${profile.persons} personnes`} unit="pers." />
          <AppText variant="h2">Quels repas planifier ?</AppText>
          <MealPicker value={profile} onChange={(patch) => setProfile(patch)} />
          <AppText variant="h2">Où faites-vous vos courses ?</AppText>
          <PostalCodeField value={postalCode} onChange={(v) => setSetting('postalCode', v)} />
        </View>
      )}

      {step === 2 && <DietPicker diet={profile.diet} onChange={(diet) => setProfile({ diet })} />}

      {step === 3 && (
        <View style={styles.block}>
          <AppText color="textMuted">Choisissez ce que vous aimez manger : la semaine sera composée d’abord avec ces cuisines.</AppText>
          <CuisinePicker value={profile.preferredCuisines} onChange={(preferredCuisines) => setProfile({ preferredCuisines })} />
        </View>
      )}

      {step === 4 && (
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

      {step === 5 && (
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

      {step === 6 && (
        <View style={styles.block}>
          <AppText>On évitera ces ingrédients :</AppText>
          <View style={styles.wrap}>
            {DISLIKE_SUGGESTIONS.map((id) => {
              const selected = profile.dislikedIngredientIds.includes(id);
              const name = INGREDIENTS.find((i) => i.id === id)!.name;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={name}
                  onPress={() => setProfile({ dislikedIngredientIds: toggle(profile.dislikedIngredientIds, id) })}
                  style={[styles.pick, { backgroundColor: selected ? theme.primary : theme.surface }]}
                >
                  <FoodImage ingredientId={id} size={44} tile="none" />
                  <AppText variant="caption" color={selected ? 'onPrimary' : 'text'} numberOfLines={1}>
                    {name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText color="textMuted">Vous pourrez en ajouter d’autres depuis l’onglet Profil.</AppText>
        </View>
      )}

      <View style={styles.actions}>
        {step > 0 ? <Button label="Retour" variant="ghost" onPress={() => setStep(step - 1)} /> : <View />}
        <Button label={step === 0 ? 'Commencer' : step === last ? 'Composer ma semaine' : 'Continuer'} onPress={() => (step === last ? finish() : setStep(step + 1))} icon={step === last ? 'sparkles' : undefined} style={styles.grow} />
      </View>
      {step >= 2 && step < last ? <Button label="Passer les étapes restantes" variant="ghost" compact onPress={finish} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: Spacing.sm },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  block: { gap: Spacing.md },
  welcome: { gap: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.lg },
  dishes: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  dishSide: { marginLeft: -Spacing.xl, marginBottom: Spacing.sm },
  center: { textAlign: 'center' },
  grow: { flex: 1 },
  pick: { width: 96, alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.image },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, gap: Spacing.md },
});
