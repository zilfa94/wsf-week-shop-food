import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useShoppingList } from '@/store/hooks';

export default function TabsLayout() {
  const theme = useTheme();
  const list = useShoppingList();
  const remaining = list ? list.items.filter((i) => i.packs > 0 && !i.checked).length : 0;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ma semaine',
          tabBarLabel: 'Semaine',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Liste de courses',
          tabBarLabel: 'Courses',
          tabBarBadge: remaining > 0 ? remaining : undefined,
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Garde-manger',
          tabBarLabel: 'Garde-manger',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'file-tray-stacked' : 'file-tray-stacked-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
