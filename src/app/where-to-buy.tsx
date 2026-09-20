import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, FoodImage, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { compareStores, priceAgeDays, PRICE_MAX_AGE_DAYS, sourceLabel, type StoreQuote } from '@/core/prices';
import { formatNumber, formatPrice, ingredientName } from '@/core/units';
import { usePriceStore } from '@/services/prices';
import { useAppStore } from '@/store';
import { INGREDIENT_INDEX, useShoppingList, useToday } from '@/store/hooks';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function formatValidity(from?: string, until?: string): string | null {
  if (!from && !until) return null;
  const f = from ? formatDate(`${from}T12:00:00`) : null;
  const u = until ? formatDate(`${until}T12:00:00`) : null;
  if (f && u) return `du ${f} au ${u}`;
  if (f) return `à partir du ${f}`;
  return `jusqu’au ${u}`;
}

function StoreCard({ quote, today, toBuyCount }: { quote: StoreQuote; today: string; toBuyCount: number }) {
  const age = priceAgeDays(quote.scrapedAt, today);
  const stale = age > PRICE_MAX_AGE_DAYS;
  const scope = quote.postalCode ? `${quote.storeName} (${quote.postalCode})` : quote.storeName;
  // Distance connue seulement quand le robot a choisi ce magasin comme le plus proche du code postal de l'utilisateur.
  const distance = quote.distanceKm !== undefined ? ` · à ${formatNumber(quote.distanceKm, 1)} km` : '';
  return (
    <Card>
      <AppText variant="h2">{scope}</AppText>
      <AppText variant="caption" color={stale ? 'danger' : 'textMuted'}>
        {`${sourceLabel(quote.source)}${distance} · relevé le ${formatDate(quote.scrapedAt)}${stale ? ' (ancien)' : ''}`}
      </AppText>
      <AppText variant="bodyStrong" tabular>{`${formatPrice(quote.total)} pour ${quote.coveredCount} article${quote.coveredCount > 1 ? 's' : ''} sur ${toBuyCount}`}</AppText>
      {quote.indicativeTotal > 0 ? (
        <AppText variant="caption" color="textMuted" tabular>{`Prix indicatifs de l’app pour ces mêmes articles : ${formatPrice(quote.indicativeTotal)}`}</AppText>
      ) : null}
      <View style={styles.lines}>
        {quote.lines.map((line) => {
          const ing = INGREDIENT_INDEX.get(line.ingredientId);
          const validity = formatValidity(line.entry.validFrom, line.entry.validUntil);
          return (
            <View key={`${line.ingredientId}-${line.entry.url}`} style={styles.line}>
              <FoodImage ingredientId={line.ingredientId} size={40} />
              <View style={styles.lineText}>
                <AppText variant="bodyStrong">{ing ? ingredientName(ing, 1) : line.ingredientId}</AppText>
                <AppText variant="caption" color="textMuted">
                  {`${line.entry.productName}${line.entry.packLabel ? ` · ${line.entry.packLabel}` : ''}${line.packs > 1 ? ` × ${line.packs}` : ''}`}
                </AppText>
                {validity ? (
                  <AppText variant="caption" color="textMuted">{`${line.entry.promo ? 'Offre ' : 'Prix '}${validity}`}</AppText>
                ) : null}
              </View>
              <AppText variant="bodyStrong" tabular>{formatPrice(line.total)}</AppText>
            </View>
          );
        })}
      </View>
      {quote.uncovered.length > 0 ? (
        <AppText variant="caption" color="textMuted">
          {`Sans prix relevé ici : ${quote.uncovered.map((id) => { const ing = INGREDIENT_INDEX.get(id); return ing ? ingredientName(ing, 1) : id; }).join(', ')}.`}
        </AppText>
      ) : null}
      {quote.lines[0]?.entry.url ? (
        <Button label="Voir chez l’enseigne" icon="open-outline" variant="ghost" compact onPress={() => Linking.openURL(quote.lines[0]!.entry.url)} />
      ) : null}
    </Card>
  );
}

/** « Où acheter » : devis par magasin à partir des relevés réels, sans jamais inventer un prix. */
export default function WhereToBuyScreen() {
  const router = useRouter();
  const today = useToday();
  const list = useShoppingList();
  const plan = useAppStore((s) => s.currentPlan);
  const rawPostalCode = useAppStore((s) => s.settings.postalCode);
  // Un code incomplet vaut « inconnu » : on ne filtre pas les magasins sur 4 chiffres.
  const postalCode = rawPostalCode.length === 5 ? rawPostalCode : '';
  const cache = usePriceStore((s) => s.cache);
  const loading = usePriceStore((s) => s.loading);
  const error = usePriceStore((s) => s.error);
  const hydrated = usePriceStore((s) => s.hydrated);
  const hydrate = usePriceStore((s) => s.hydrate);
  const refresh = usePriceStore((s) => s.refresh);

  useEffect(() => {
    void hydrate().then(() => refresh(postalCode));
  }, [hydrate, refresh, postalCode]);

  const quotes = useMemo(
    () => (list && plan && cache ? compareStores(list, cache.files, INGREDIENT_INDEX, postalCode, plan.weekStart) : []),
    [list, plan, cache, postalCode],
  );
  const toBuyCount = list ? list.items.filter((i) => i.packs > 0).length : 0;

  if (!list || !plan || toBuyCount === 0) {
    return (
      <Screen>
        <EmptyState icon="storefront-outline" title="Rien à acheter" body="Composez une semaine pour comparer les magasins." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">Où acheter</AppText>
      <AppText color="textMuted">
        {postalCode
          ? `Magasins proches du ${postalCode} et offres nationales. Seuls les prix réellement relevés sont affichés.`
          : 'Offres nationales seulement : indiquez votre code postal dans le Profil pour voir les magasins proches.'}
      </AppText>
      {!hydrated || (loading && !cache) ? (
        <Card>
          <AppText color="textMuted">Chargement des relevés…</AppText>
        </Card>
      ) : null}
      {error && !cache ? (
        <Card tone="alt">
          <AppText variant="bodyStrong">{error}</AppText>
          <Button label="Réessayer" icon="refresh" compact variant="secondary" onPress={() => refresh(postalCode, true)} />
        </Card>
      ) : null}
      {cache && quotes.length === 0 ? (
        <EmptyState icon="pricetag-outline" title="Aucun relevé pour votre liste" body="Les enseignes suivies n’ont publié aucun prix pour ces articles cette semaine. Rien n’est estimé à leur place." />
      ) : null}
      {quotes.map((q) => (
        <StoreCard key={`${q.retailer}-${q.storeId}`} quote={q} today={today} toBuyCount={toBuyCount} />
      ))}
      {cache ? (
        <View style={styles.footer}>
          <AppText variant="caption" color="textMuted">{`Relevés téléchargés le ${formatDate(cache.fetchedAt)}${error ? ` · ${error}` : ''}`}</AppText>
          <Button label="Actualiser" icon="refresh" variant="ghost" compact loading={loading} onPress={() => refresh(postalCode, true)} />
          {!postalCode ? <Button label="Indiquer mon code postal" icon="location-outline" variant="secondary" compact onPress={() => router.push('/(tabs)/profile')} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lines: { gap: Spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  lineText: { flex: 1, gap: 2 },
  footer: { gap: Spacing.sm, alignItems: 'flex-start' },
});
