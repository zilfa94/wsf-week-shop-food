/** Choix du magasin Auchan le plus proche et lecture du géocodage, sur des réponses réelles (fixtures/). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { nearestStores } from '../auchan.ts';
import { isPostalCode, placeFromGeocoding, type Place } from '../geocode.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown => JSON.parse(readFileSync(resolve(here, 'fixtures', name), 'utf8'));
const alfortville: Place = { postalCode: '94140', city: 'Alfortville', latitude: 48.797176, longitude: 2.421524 };

test('nearestStores : le drive et le click & collect les plus proches, vendus sur auchan.fr', () => {
  const { offeringContexts } = fixture('auchan-journey-search-94140.json') as { offeringContexts: never[] };
  const stores = nearestStores(offeringContexts, alfortville, ['DRIVE', 'PICKUP_POINT'], 20);
  assert.deepEqual(
    stores.map((s) => [s.kind, s.storeId, s.postalCode, s.serves[0]!.distanceKm]),
    [
      ['DRIVE', '975', '94270', 4.3], // Kremlin-Bicêtre ; le drive de Saint-Maur (5,9 km) n'est pas vendu sur auchan.fr
      ['PICKUP_POINT', '6453', '94700', 1.1], // Maisons-Alfort, le plus proche ; les casiers (LOCKERS) sont ignorés
    ],
  );
  assert.equal(stores[0]!.storeName, 'Auchan Drive Hypermarché KREMLIN BICETRE');
  assert.equal(stores[0]!.sellerId, '0eff75ff-b966-4146-9457-dc82809a2a72');
  assert.equal(stores[0]!.search, alfortville);
});

test('nearestStores : rayon maximal et types demandés', () => {
  const { offeringContexts } = fixture('auchan-journey-search-94140.json') as { offeringContexts: never[] };
  assert.deepEqual(nearestStores(offeringContexts, alfortville, ['DRIVE'], 3), []);
  assert.deepEqual(
    nearestStores(offeringContexts, alfortville, ['PICKUP_POINT'], 3).map((s) => s.storeId),
    ['6453'],
  );
  assert.deepEqual(nearestStores([], alfortville, ['DRIVE', 'PICKUP_POINT'], 20), []);
});

test('placeFromGeocoding : commune au code postal exact, sinon rien', () => {
  const versailles = placeFromGeocoding(fixture('geocode-78000.json'), '78000');
  assert.deepEqual(versailles, { postalCode: '78000', city: 'Versailles', latitude: 48.802928, longitude: 2.121128 });
  assert.equal(placeFromGeocoding(fixture('geocode-78000.json'), '78001'), null);
  assert.equal(placeFromGeocoding({ features: [] }, '78000'), null);
  assert.equal(placeFromGeocoding(null, '78000'), null);
  assert.equal(isPostalCode('94140'), true);
  assert.equal(isPostalCode('9414'), false);
  assert.equal(isPostalCode('94140 '), false);
});
