import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import type { IoniconName } from './button';

export interface TabBarProps extends BottomTabBarProps {
  /** Icônes (repos / actif) par nom de route. */
  readonly icons: Readonly<Record<string, readonly [IoniconName, IoniconName]>>;
  /** Pastille numérique par nom de route (articles restants). */
  readonly badges?: Readonly<Record<string, number | undefined>>;
  /** Bouton central rond jaune du modèle ; les onglets se répartissent de part et d'autre. */
  readonly onCenterPress: () => void;
  readonly centerLabel: string;
}

/** Barre d'onglets du modèle : blanche, coins supérieurs arrondis, bouton central rond jaune. */
export function TabBar({ state, descriptors, navigation, icons, badges, onCenterPress, centerLabel }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const half = Math.ceil(state.routes.length / 2);
  const renderTab = (route: (typeof state.routes)[number], index: number) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const label = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : (options?.title ?? route.name);
    const [idle, active] = icons[route.name] ?? ['ellipse-outline', 'ellipse'];
    const badge = badges?.[route.name];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={styles.tab}
      >
        <View>
          <Ionicons name={focused ? active : idle} size={24} color={focused ? theme.text : theme.textMuted} />
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <AppText variant="caption" color="onPrimary" style={styles.badgeText} tabular>
                {badge > 99 ? '99+' : String(badge)}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" color={focused ? 'text' : 'textMuted'} style={[styles.label, focused ? styles.activeLabel : null]} numberOfLines={1}>
          {label}
        </AppText>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, Shadow.card, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      {state.routes.slice(0, half).map(renderTab)}
      <View style={styles.centerSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={centerLabel}
          onPress={onCenterPress}
          style={({ pressed }) => [styles.center, Shadow.float, { backgroundColor: theme.primary }, pressed ? styles.pressed : null]}
        >
          <Ionicons name="add" size={32} color={theme.onPrimary} />
        </Pressable>
      </View>
      {state.routes.slice(half).map((route, i) => renderTab(route, i + half))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingVertical: Spacing.xs, minHeight: 52 },
  label: { fontSize: 11, lineHeight: 14 },
  activeLabel: { fontWeight: '700' },
  centerSlot: { width: 72, alignItems: 'center', justifyContent: 'flex-end' },
  center: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    marginBottom: Spacing.xs,
  },
  pressed: { transform: [{ scale: 0.95 }] },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '700' },
});
