import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme, useThemeName } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  readonly children: ReactNode;
  readonly onPress?: () => void;
  readonly onLongPress?: () => void;
  /** `surface` : carte blanche à ombre douce ; `alt` : gris léger ; `accent` : jaune pâle (mise en avant). */
  readonly tone?: 'surface' | 'alt' | 'accent';
  readonly accessibilityLabel?: string;
}

/** Carte du modèle : blanche, très arrondie, posée sur le fond par une ombre douce (bordure fine en sombre). */
export function Card({ children, onPress, onLongPress, tone = 'surface', style, accessibilityLabel, ...rest }: CardProps) {
  const theme = useTheme();
  const dark = useThemeName() === 'dark';
  const background = tone === 'alt' ? theme.surfaceAlt : tone === 'accent' ? theme.primarySoft : theme.surface;
  const base = [
    styles.card,
    tone === 'surface' && !dark ? Shadow.card : null,
    { backgroundColor: background, borderColor: theme.border, borderWidth: dark ? StyleSheet.hairlineWidth : 0 },
    style,
  ];
  if (!onPress && !onLongPress) {
    return (
      <View {...rest} style={base}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [base, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
