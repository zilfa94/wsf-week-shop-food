import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export interface SnackbarProps {
  readonly message: string | null;
  readonly action?: { readonly label: string; readonly onPress: () => void };
  readonly onDismiss: () => void;
  readonly durationMs?: number;
}

/** Message temporaire en bas d'écran avec action optionnelle (undo). */
export function Snackbar({ message, action, onDismiss, durationMs = 5000 }: SnackbarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onDismiss]);
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.bar, { backgroundColor: theme.text, bottom: Spacing.lg + insets.bottom }]}
    >
      <AppText style={[styles.message, { color: theme.bg }]} numberOfLines={2}>
        {message}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <AppText variant="bodyStrong" style={{ color: theme.accent }}>
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  message: { flex: 1 },
});
