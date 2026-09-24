import { StyleSheet, View } from 'react-native';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export interface StatTileProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  /** Teinte de fond : chaque chiffre porte sa couleur, sinon la rangée de tuiles paraît terne. */
  readonly tone?: 'default' | 'accent' | 'success' | 'info';
}

const TONES = { accent: 'accentSoft', success: 'successSoft', info: 'infoSoft', default: 'surface' } as const;

export function StatTile({ label, value, hint, tone = 'default' }: StatTileProps) {
  const theme = useTheme();
  const background = theme[TONES[tone]];
  return (
    <View style={[styles.tile, tone === 'default' ? Shadow.card : null, { backgroundColor: background }]} accessibilityLabel={`${label} : ${value}${hint ? `, ${hint}` : ''}`}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="h2" tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: Radius.card, padding: Spacing.md, gap: 2 },
});
