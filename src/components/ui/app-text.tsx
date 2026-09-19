import { Text, type TextProps } from 'react-native';
import { Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface AppTextProps extends TextProps {
  readonly variant?: TypographyVariant;
  readonly color?: 'text' | 'textMuted' | 'primary' | 'accent' | 'danger' | 'success' | 'onPrimary';
  /** Chiffres tabulaires (quantités, prix). */
  readonly tabular?: boolean;
}

export function AppText({ variant = 'body', color = 'text', tabular = false, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[Typography[variant], { color: theme[color] }, tabular ? { fontVariant: ['tabular-nums'] } : null, style]}
    />
  );
}
