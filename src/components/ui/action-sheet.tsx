import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { Button, type ButtonProps, type IoniconName } from './button';

export interface SheetAction {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonProps['variant'];
  readonly icon?: IoniconName;
}

export interface ActionSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly message?: string;
  readonly actions: readonly SheetAction[];
  readonly onClose: () => void;
  readonly cancelLabel?: string;
}

/**
 * Feuille d'actions maison (menu contextuel, confirmation) : remplace `Alert.alert`, muet sur le web,
 * sans dépendance externe. Se ferme au tap sur le fond ou sur « Annuler ».
 */
export function ActionSheet({ visible, title, message, actions, onClose, cancelLabel = 'Annuler' }: ActionSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Spacing.lg + insets.bottom }]}>
        <AppText variant="h2">{title}</AppText>
        {message ? <AppText color="textMuted">{message}</AppText> : null}
        {actions.map((a) => (
          <Button
            key={a.label}
            label={a.label}
            icon={a.icon}
            variant={a.variant ?? 'secondary'}
            onPress={() => {
              onClose();
              a.onPress();
            }}
          />
        ))}
        <Button label={cancelLabel} variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
});
