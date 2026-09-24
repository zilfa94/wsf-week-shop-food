import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, Checkbox, FoodImage, Screen, SectionHeader } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { addDays } from '@/core/date';
import { readReceipt, type ReceiptLine } from '@/core/receipt';
import { formatPrice, formatQuantity, ingredientName } from '@/core/units';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useToday } from '@/store/hooks';

const EXEMPLE = [
  'TOMATES GRAPPE 1KG            2,49',
  'PDT CHARLOTTE 1,5KG           3,15',
  'CRM FRAICHE EPAISSE 20CL      1,29',
  'OEUFS PLEIN AIR X6            2,95',
].join('\n');

/**
 * Ticket de caisse → garde-manger. L'app **propose**, l'utilisateur valide : chaque ligne est
 * décochable, et les lignes non comprises restent affichées au lieu de disparaître en silence.
 * La photo (OCR) viendra alimenter ce même écran ; pour l'instant le texte est collé à la main.
 */
export default function ReceiptScreen() {
  const router = useRouter();
  const theme = useTheme();
  const today = useToday();
  const haptics = useHaptics();
  const upsert = useAppStore((s) => s.upsertPantryItem);
  const [text, setText] = useState('');
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());

  const lines = useMemo(() => (text.trim() ? readReceipt(text, INGREDIENT_INDEX) : []), [text]);
  const recognized = lines.filter((l) => l.ingredientId !== null);
  const kept = recognized.filter((l) => !skipped.has(l.raw));
  const unknown = lines.filter((l) => l.ingredientId === null);

  const toggle = (raw: string) =>
    setSkipped((s) => {
      const next = new Set(s);
      if (next.has(raw)) next.delete(raw);
      else next.add(raw);
      return next;
    });

  const commit = () => {
    for (const line of kept) {
      const ingredient = INGREDIENT_INDEX.get(line.ingredientId!);
      if (!ingredient || line.quantity === null) continue;
      upsert({
        ingredientId: ingredient.id,
        quantity: line.quantity,
        addedAt: today,
        expiresAt: addDays(today, ingredient.shelfLifeDays),
      });
    }
    haptics.success();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/pantry');
  };

  return (
    <Screen>
      <AppText variant="display">Ajouter un ticket</AppText>
      <AppText color="textMuted">
        Collez le texte de votre ticket de caisse : les articles reconnus entrent au garde-manger avec leur quantité.
      </AppText>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={EXEMPLE}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel="Texte du ticket de caisse"
        multiline
        textAlignVertical="top"
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
      />

      {text.trim().length === 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setText(EXEMPLE)} style={styles.tryRow}>
          <AppText variant="caption" color="primary">
            Essayer avec un exemple
          </AppText>
        </Pressable>
      ) : null}

      {recognized.length > 0 ? (
        <>
          <SectionHeader
            title={`${kept.length} article${kept.length > 1 ? 's' : ''} à ajouter`}
            subtitle={`${recognized.length} ligne${recognized.length > 1 ? 's' : ''} reconnue${recognized.length > 1 ? 's' : ''} sur ${lines.length}`}
          />
          {recognized.map((line) => {
            const ingredient = INGREDIENT_INDEX.get(line.ingredientId!)!;
            const on = !skipped.has(line.raw);
            return (
              <Card key={line.raw} style={[styles.row, on ? null : styles.off]}>
                <Checkbox checked={on} onToggle={() => toggle(line.raw)} accessibilityLabel={`${ingredient.name}, ${on ? 'à ajouter' : 'ignoré'}`} />
                <FoodImage ingredientId={ingredient.id} size={44} />
                <View style={styles.texts}>
                  <AppText variant="bodyStrong">{ingredientName(ingredient, 1)}</AppText>
                  <AppText variant="caption" color="textMuted" numberOfLines={1}>
                    {line.raw}
                  </AppText>
                </View>
                <View style={styles.right}>
                  <AppText variant="bodyStrong" tabular>
                    {line.quantity !== null ? formatQuantity(line.quantity, ingredient.canonicalUnit, ingredient) : '—'}
                  </AppText>
                  {line.price !== null ? (
                    <AppText variant="caption" color="textMuted" tabular>
                      {formatPrice(line.price)}
                    </AppText>
                  ) : null}
                </View>
              </Card>
            );
          })}
          <Button label={`Ajouter ${kept.length} article${kept.length > 1 ? 's' : ''} au garde-manger`} icon="file-tray-stacked-outline" onPress={commit} disabled={kept.length === 0} />
        </>
      ) : null}

      {unknown.length > 0 ? (
        <Card tone="alt">
          <AppText variant="bodyStrong">{`${unknown.length} ligne${unknown.length > 1 ? 's' : ''} non reconnue${unknown.length > 1 ? 's' : ''}`}</AppText>
          <AppText variant="caption" color="textMuted">
            {unknown.map((l) => l.raw).join(' · ')}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Produits hors de notre liste d’ingrédients, ou libellés trop abrégés. Ajoutez-les à la main depuis le garde-manger.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { ...Typography.body, minHeight: 140, borderWidth: 1, borderRadius: Radius.card, padding: Spacing.md },
  tryRow: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingLeft: Spacing.xs },
  off: { opacity: 0.5 },
  texts: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
