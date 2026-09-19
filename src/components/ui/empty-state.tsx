import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { Button, type IoniconName } from './button';

export interface EmptyStateProps {
  readonly icon: IoniconName;
  readonly title: string;
  readonly body?: string;
  readonly cta?: { readonly label: string; readonly onPress: () => void };
}

export function EmptyState({ icon, title, body, cta }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={48} color={theme.primary} />
      <AppText variant="h2" style={styles.center}>
        {title}
      </AppText>
      {body ? (
        <AppText color="textMuted" style={styles.center}>
          {body}
        </AppText>
      ) : null}
      {cta ? <Button label={cta.label} onPress={cta.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  center: { textAlign: 'center' },
});
