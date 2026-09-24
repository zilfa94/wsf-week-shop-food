import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps extends ViewProps {
  readonly children: ReactNode;
  /** Contenu défilant (par défaut) ou fixe (listes qui gèrent leur propre défilement). */
  readonly scroll?: boolean;
  /** Marge basse supplémentaire (barre d'onglets, bouton flottant). */
  readonly bottomInset?: number;
  /**
   * Écarter la barre d'état / l'encoche : obligatoire pour un écran **sans en-tête de navigation**
   * (`headerShown: false`), sinon le contenu passe sous l'heure et le réseau. Les écrans à en-tête
   * n'en ont pas besoin, le navigateur s'en charge.
   */
  readonly safeTop?: boolean;
}

export function Screen({ children, scroll = true, bottomInset = 0, safeTop = false, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: Spacing.lg + (safeTop ? insets.top : 0),
    paddingBottom: Spacing.xl + bottomInset + insets.bottom,
  };
  if (!scroll) {
    return (
      <View {...rest} style={[styles.root, { backgroundColor: theme.bg }, style]}>
        <View style={[styles.content, padding]}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      {...rest}
      style={[styles.root, { backgroundColor: theme.bg }, style]}
      contentContainerStyle={[styles.content, padding]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
});
