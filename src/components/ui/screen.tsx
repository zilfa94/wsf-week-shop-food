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
}

export function Screen({ children, scroll = true, bottomInset = 0, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = { paddingBottom: Spacing.xl + bottomInset + insets.bottom };
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
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
});
