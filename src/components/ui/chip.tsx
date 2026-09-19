import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import type { IoniconName } from './button';

export interface ChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly icon?: IoniconName;
  /** `tag` : informatif ; `filter` : sélectionnable ; `allergen` : rouge léger. */
  readonly variant?: 'tag' | 'filter' | 'allergen';
}

export function Chip({ label, selected = false, onPress, icon, variant = 'tag' }: ChipProps) {
  const theme = useTheme();
  const background = variant === 'allergen' ? (selected ? theme.danger : theme.surfaceAlt) : selected ? theme.primary : theme.surfaceAlt;
  const color = selected ? theme.onPrimary : variant === 'allergen' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: background }, pressed ? styles.pressed : null]}
    >
      {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
      <AppText variant="caption" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.8 },
});
