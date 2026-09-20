import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface PostalCodeFieldProps {
  readonly value: string;
  readonly onChange: (postalCode: string) => void;
}

/** Ne garde que les chiffres, 5 au plus (codes postaux français). */
export function normalizePostalCode(text: string): string {
  return text.replace(/\D/g, '').slice(0, 5);
}

/** Code postal du foyer : sert à retenir les magasins proches dans « Où acheter ». Facultatif. */
export function PostalCodeField({ value, onChange }: PostalCodeFieldProps) {
  const theme = useTheme();
  const incomplete = value.length > 0 && value.length < 5;
  return (
    <View style={styles.block}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(normalizePostalCode(t))}
        placeholder="Code postal (ex. 94140)"
        placeholderTextColor={theme.textMuted}
        keyboardType="number-pad"
        accessibilityLabel="Code postal"
        style={[styles.input, { borderColor: incomplete ? theme.danger : theme.border, color: theme.text, backgroundColor: theme.surface }]}
      />
      <AppText variant="caption" color={incomplete ? 'danger' : 'textMuted'}>
        {incomplete ? '5 chiffres attendus.' : 'Facultatif : pour comparer les prix des magasins proches de chez vous.'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.xs },
  input: { ...Typography.body, borderWidth: 1, borderRadius: Radius.button, paddingHorizontal: Spacing.lg, minHeight: 52 },
});
