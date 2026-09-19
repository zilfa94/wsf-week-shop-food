import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, Chip, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatQuantity } from '@/core/units';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, RECIPE_INDEX, useCookWithPantry, useToday } from '@/store/hooks';

/** Recettes faisables avec le garde-manger, les plus complètes d'abord. */
export default function CookWithScreen() {
  const router = useRouter();
  const today = useToday();
  const pantry = useAppStore((s) => s.pantry);
  const feasible = useCookWithPantry(today);

  if (pantry.length < 3) {
    return (
      <Screen>
        <EmptyState icon="restaurant-outline" title="Ajoutez au moins 3 ingrédients" body="Les suggestions s’appuient sur ce que contient votre garde-manger." />
      </Screen>
    );
  }
  if (feasible.length === 0) {
    return (
      <Screen>
        <EmptyState icon="search-outline" title="Aucune recette faisable à 80 %" body="Complétez votre stock ou lancez une semaine : la liste de courses s’en charge." />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader title="Cuisiner avec ce que j’ai" subtitle={`${feasible.length} recette${feasible.length > 1 ? 's' : ''} faisable${feasible.length > 1 ? 's' : ''}`} />
      {feasible.map((f) => {
        const recipe = RECIPE_INDEX.get(f.recipeId);
        if (!recipe) return null;
        return (
          <Card key={f.recipeId} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: f.recipeId } })} accessibilityLabel={recipe.name}>
            <AppText variant="bodyStrong">{recipe.name}</AppText>
            <View style={styles.wrap}>
              <Chip label={`${Math.round(f.ratio * 100)} % en stock`} icon="checkmark-circle" />
              {f.missing.slice(0, 3).map((m) => {
                const ing = INGREDIENT_INDEX.get(m.ingredientId);
                return <Chip key={m.ingredientId} label={`manque ${ing ? formatQuantity(m.quantity, ing.canonicalUnit, ing) : m.ingredientId}${ing && ing.canonicalUnit !== 'piece' ? ` de ${ing.name}` : ''}`} />;
              })}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
