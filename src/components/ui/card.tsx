import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  readonly children: ReactNode;
  readonly onPress?: () => void;
  readonly onLongPress?: () => void;
  readonly tone?: 'surface' | 'alt' | 'accent';
  readonly accessibilityLabel?: string;
}

export function Card({ children, onPress, onLongPress, tone = 'surface', style, accessibilityLabel, ...rest }: CardProps) {
  const theme = useTheme();
  const background = tone === 'alt' ? theme.surfaceAlt : tone === 'accent' ? theme.accentSoft : theme.surface;
  const base = [styles.card, { backgroundColor: background, borderColor: theme.border }, style];
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
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
});
