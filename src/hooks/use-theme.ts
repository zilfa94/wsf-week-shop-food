/** Thème courant : suit le système, sauf si le réglage `themeMode` force clair ou sombre. */
import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import { selectThemeMode } from '@/store/selectors';

export type ThemeName = 'light' | 'dark';

export function useThemeName(): ThemeName {
  const scheme = useColorScheme();
  const mode = useAppStore(selectThemeMode);
  if (mode === 'light' || mode === 'dark') return mode;
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  return Colors[useThemeName()];
}
