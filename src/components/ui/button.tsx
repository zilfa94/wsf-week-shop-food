import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly icon?: IoniconName;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly compact?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, compact, style, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const background = isPrimary ? theme.primary : isDanger ? theme.danger : variant === 'secondary' ? theme.surface : 'transparent';
  const border = variant === 'secondary' ? theme.primary : 'transparent';
  const color = isPrimary || isDanger ? theme.onPrimary : variant === 'ghost' ? theme.primary : theme.primary;
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
        { backgroundColor: background, borderColor: border },
        pressed ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <AppText variant="bodyStrong" style={{ color }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  compact: { minHeight: TouchTarget, paddingHorizontal: Spacing.lg, ...Typography.caption },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
