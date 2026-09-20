import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CheckboxProps {
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly accessibilityLabel: string;
}

export function Checkbox({ checked, onToggle, accessibilityLabel }: CheckboxProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={onToggle}
      hitSlop={8}
      style={styles.target}
    >
      <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={checked ? theme.primary : theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { width: TouchTarget, height: TouchTarget, alignItems: 'center', justifyContent: 'center' },
});
