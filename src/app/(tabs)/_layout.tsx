import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheet, type IoniconName } from '@/components/ui';
import { TabBar } from '@/components/ui/tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { useShoppingList } from '@/store/hooks';

const ICONS: Readonly<Record<string, readonly [IoniconName, IoniconName]>> = {
  index: ['calendar-outline', 'calendar'],
  shopping: ['cart-outline', 'cart'],
  pantry: ['file-tray-stacked-outline', 'file-tray-stacked'],
  profile: ['person-outline', 'person'],
};

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const list = useShoppingList();
  const hasPlan = useAppStore((s) => s.currentPlan !== null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const remaining = list ? list.items.filter((i) => i.packs > 0 && !i.checked).length : 0;

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <TabBar {...props} icons={ICONS} badges={{ shopping: remaining > 0 ? remaining : undefined }} centerLabel="Actions rapides" onCenterPress={() => setSheetOpen(true)} />
        )}
        screenOptions={{
          // Pas d'en-tête natif : chaque onglet porte son propre grand titre (modèle de design),
          // et `Screen safeTop` écarte la barre d'état.
          headerShown: false,
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Ma semaine', tabBarLabel: 'Semaine' }} />
        <Tabs.Screen name="shopping" options={{ title: 'Liste de courses', tabBarLabel: 'Courses' }} />
        <Tabs.Screen name="pantry" options={{ title: 'Garde-manger', tabBarLabel: 'Garde-manger' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarLabel: 'Profil' }} />
      </Tabs>
      {/* Bouton central « + » du modèle : les actions transverses, sans quitter l'onglet courant. */}
      <ActionSheet
        visible={sheetOpen}
        title="Que voulez-vous faire ?"
        onClose={() => setSheetOpen(false)}
        actions={[
          ...(hasPlan
            ? [
                { label: 'Où acheter ? Comparer les prix', icon: 'storefront-outline' as const, onPress: () => router.push('/where-to-buy') },
                { label: 'Mode magasin', icon: 'basket-outline' as const, onPress: () => router.push('/store-mode') },
              ]
            : []),
          { label: 'Ajouter au garde-manger', icon: 'add-circle-outline' as const, onPress: () => router.push('/pantry-add') },
          { label: 'Ajouter un ticket de caisse', icon: 'receipt-outline' as const, onPress: () => router.push('/receipt') },
          { label: 'Cuisiner avec ce que j’ai', icon: 'restaurant-outline' as const, onPress: () => router.push('/cook-with') },
          ...(hasPlan ? [{ label: 'Bilan de la semaine', icon: 'stats-chart-outline' as const, onPress: () => router.push('/report') }] : []),
        ]}
      />
    </>
  );
}
