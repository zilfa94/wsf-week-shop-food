import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Radius, Shadow, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  /** `primary` : jaune plein (action principale, flèche « → » comme le modèle) ; `secondary` : blanc ; `ghost` : texte seul. */
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly icon?: IoniconName;
  /** Flèche « → » devant le libellé (boutons d'action du modèle). Par défaut pour `primary` non compact sans icône. */
  readonly arrow?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly compact?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, arrow, loading, disabled, compact, style, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const background = isPrimary ? theme.primary : isDanger ? theme.danger : variant === 'secondary' ? theme.surface : 'transparent';
  const color = isPrimary ? theme.onPrimary : isDanger ? '#FFFFFF' : theme.text;
  const showArrow = arrow ?? (isPrimary && !compact && !icon);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : null,
        { backgroundColor: background },
        isPrimary && !inactive ? Shadow.float : null,
        variant === 'secondary' ? [styles.secondary, { borderColor: theme.border }] : null,
        pressed ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={color} /> : null}
          <AppText variant={compact ? 'caption' : 'bodyStrong'} style={[{ color }, compact ? styles.compactLabel : styles.label]}>
            {showArrow ? `→  ${label}` : label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondary: { borderWidth: 1 },
  compact: { minHeight: TouchTarget - 4, paddingHorizontal: Spacing.lg, borderRadius: Radius.chip },
  label: { fontWeight: '700', letterSpacing: 0.3 },
  compactLabel: { fontWeight: '600' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
