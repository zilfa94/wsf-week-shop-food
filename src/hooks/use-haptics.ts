/** Retour haptique léger, désactivable dans les réglages ; sans effet sur le web. */
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '@/store';

export function useHaptics() {
  const enabled = useAppStore((s) => s.settings.hapticsEnabled);
  const tap = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [enabled]);
  const success = useCallback(() => {
    if (!enabled || Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [enabled]);
  return { tap, success };
}
