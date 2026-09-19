import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { AppText } from './app-text';

export interface SectionHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Élément à droite (compteur, bouton compact). */
  readonly right?: ReactNode;
}

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  texts: { flex: 1, gap: 2 },
});
