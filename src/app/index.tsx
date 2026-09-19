import { Redirect } from 'expo-router';
import { useAppStore } from '@/store';
import { selectHasOnboarded } from '@/store/selectors';

/** Point d'entrée : onboarding au premier lancement, sinon les onglets. */
export default function Index() {
  const hasOnboarded = useAppStore(selectHasOnboarded);
  return <Redirect href={hasOnboarded ? '/(tabs)' : '/onboarding'} />;
}
