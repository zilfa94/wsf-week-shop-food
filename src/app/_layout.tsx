import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme, useThemeName } from '@/hooks/use-theme';
import { useHydrated } from '@/store/hooks';

// Le splash reste affiché tant que l'état n'est pas restauré (évite un flash « onboarding »).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useHydrated();
  const theme = useTheme();
  const themeName = useThemeName();

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="generating" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="day/[day]" options={{ title: 'Journée' }} />
          <Stack.Screen name="recipe/[id]" options={{ title: 'Recette' }} />
          <Stack.Screen name="swap/[mealId]" options={{ presentation: 'modal', title: 'Remplacer le repas' }} />
          <Stack.Screen name="item/[ingredientId]" options={{ presentation: 'modal', title: 'Article' }} />
          <Stack.Screen name="pantry-add" options={{ presentation: 'modal', title: 'Ajouter au garde-manger' }} />
          <Stack.Screen name="cook-with" options={{ title: 'Cuisiner avec ce que j’ai' }} />
          <Stack.Screen name="report" options={{ presentation: 'modal', title: 'Bilan' }} />
          <Stack.Screen name="store-mode" options={{ presentation: 'fullScreenModal', title: 'Mode magasin' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
