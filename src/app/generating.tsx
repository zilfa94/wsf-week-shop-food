import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { useToday } from '@/store/hooks';

const MESSAGES = ['Sélection de plats variés…', 'Regroupement des ingrédients périssables…', 'Calcul des paquets à acheter…'];
/** Durée minimale d'affichage pour que les 3 messages soient lisibles. */
const MIN_DISPLAY_MS = 1800;

/** Écran de génération : rend visible le travail anti-gaspi, puis renvoie vers la semaine. */
export default function GeneratingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const regenerate = useAppStore((s) => s.regeneratePlan);
  const generate = useAppStore((s) => s.generatePlan);
  const hasPlan = useAppStore((s) => s.currentPlan !== null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, MESSAGES.length - 1)), 700);
    const start = Date.now();
    let done: ReturnType<typeof setTimeout> | undefined;
    // Un court délai laisse l'écran se peindre avant le calcul (synchrone, ~150-300 ms) ;
    // InteractionManager n'est pas utilisé : sur le web son rappel peut ne jamais venir.
    const run = setTimeout(() => {
      try {
        if (hasPlan) regenerate({ today });
        else generate({ today });
      } catch (e) {
        console.error('Génération du plan impossible', e);
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      done = setTimeout(() => router.replace('/(tabs)'), Math.max(0, MIN_DISPLAY_MS - (Date.now() - start)));
    }, 50);
    return () => {
      clearInterval(ticker);
      clearTimeout(run);
      if (done) clearTimeout(done);
    };
    // Génération une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {error ? (
        <>
          <AppText variant="h1" style={styles.center}>
            Impossible de composer la semaine
          </AppText>
          <AppText color="danger" style={styles.center}>
            {error}
          </AppText>
          <Button label="Retour" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <AppText variant="h1" style={styles.center}>
            On compose votre semaine…
          </AppText>
          <AppText color="textMuted" style={styles.center} accessibilityLiveRegion="polite">
            {MESSAGES[step]}
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, padding: Spacing.xxl },
  center: { textAlign: 'center' },
});
