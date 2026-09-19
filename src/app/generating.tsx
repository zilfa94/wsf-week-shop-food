import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { useToday } from '@/store/hooks';

const MESSAGES = ['Sélection de plats variés…', 'Regroupement des ingrédients périssables…', 'Calcul des paquets à acheter…'];

/** Écran de génération : rend visible le travail anti-gaspi, puis renvoie vers la semaine. */
export default function GeneratingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const regenerate = useAppStore((s) => s.regeneratePlan);
  const generate = useAppStore((s) => s.generatePlan);
  const hasPlan = useAppStore((s) => s.currentPlan !== null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, MESSAGES.length - 1)), 700);
    const task = InteractionManager.runAfterInteractions(() => {
      if (hasPlan) regenerate({ today });
      else generate({ today });
    });
    const done = setTimeout(() => router.replace('/(tabs)'), 2200);
    return () => {
      clearInterval(ticker);
      clearTimeout(done);
      task.cancel();
    };
    // Génération une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <AppText variant="h1" style={styles.center}>
        On compose votre semaine…
      </AppText>
      <AppText color="textMuted" style={styles.center} accessibilityLiveRegion="polite">
        {MESSAGES[step]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, padding: Spacing.xxl },
  center: { textAlign: 'center' },
});
