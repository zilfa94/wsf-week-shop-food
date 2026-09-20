import { indexIngredients } from '../dataset';
import { bestLine, compareStores, fileMatchesPostalCode, isEntryValid, packSizeCanonical, priceAgeDays, quoteStore, unitPriceCanonical } from '../prices';
import { buildShoppingList } from '../shopping';
import type { PriceEntry, PriceFile, ShoppingList } from '../types';
import { makeMeal, makePlan } from './fixtures/plans';
import { CHICKEN, EGG, PASTA, TOMATO } from './fixtures/ingredients';
import { FIXTURE_INGREDIENTS, FIXTURE_RECIPES, MILK } from './fixtures/recipes';

const DATASET = { version: 't', ingredients: FIXTURE_INGREDIENTS, recipes: FIXTURE_RECIPES };
const INGREDIENTS = indexIngredients(FIXTURE_INGREDIENTS);
const WEEK = '2026-09-14';

const entry = (over: Partial<PriceEntry> & Pick<PriceEntry, 'ingredientId' | 'price' | 'unit' | 'packSize'>): PriceEntry => ({
  productName: 'produit',
  unitPrice: Math.round((over.price / over.packSize) * 100) / 100,
  packLabel: '',
  url: '',
  ...over,
});

const file = (over: Partial<PriceFile>): PriceFile => ({
  retailer: 'lidl',
  storeId: 'national',
  storeName: 'Lidl — offres en supermarché',
  postalCode: '',
  source: 'store',
  scrapedAt: '2026-09-13T05:00:00.000Z',
  scraperVersion: '0.1.0',
  prices: [],
  ...over,
});

/** Pâtes au poulet (200 g pâtes, 300 g poulet, 3 tomates) + omelette (4 œufs) pour 2 personnes. */
function list(): ShoppingList {
  const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet'), makeMeal(1, 'dinner', 'omelette')]);
  return buildShoppingList({ plan, dataset: DATASET, profile: plan.profileSnapshot, pantry: [], checked: {}, packChoices: {}, manualItems: [] });
}

describe('conversions prix ↔ unité canonique', () => {
  it('convertit €/kg en €/g et pièce ↔ kg via conversions.piece', () => {
    expect(unitPriceCanonical(entry({ ingredientId: 'pates_penne', price: 1.99, unit: 'kg', packSize: 0.5 }), PASTA)).toBeCloseTo(0.00398, 5);
    // Tomate : canonique g, vendue à la pièce (120 g) : 0,50 €/pièce → 0,50/120 €/g.
    expect(unitPriceCanonical(entry({ ingredientId: 'tomate', price: 0.5, unit: 'piece', packSize: 1 }), TOMATO)).toBeCloseTo(0.5 / 120, 6);
    // Œuf (fixture sans poids) : canonique pièce, vendu au kg → conversion inconnue → null (jamais deviné).
    expect(unitPriceCanonical(entry({ ingredientId: 'oeuf', price: 5, unit: 'kg', packSize: 1 }), EGG)).toBeNull();
    // Citron avec poids moyen (110 g) : 500 g à 1,29 € → 4,545 citrons, 0,284 €/citron.
    const lemon = { ...EGG, id: 'citron', conversions: { g: 1 / 110 } };
    expect(unitPriceCanonical(entry({ ingredientId: 'citron', price: 1.29, unit: 'kg', packSize: 0.5 }), lemon)).toBeCloseTo(2.58 / 1000 * 110, 4);
    expect(packSizeCanonical(entry({ ingredientId: 'citron', price: 1.29, unit: 'kg', packSize: 0.5 }), lemon)).toBeCloseTo(500 / 110, 3);
    // Lait : canonique ml, vendu au litre.
    expect(unitPriceCanonical(entry({ ingredientId: 'lait', price: 1.05, unit: 'l', packSize: 1 }), MILK)).toBeCloseTo(0.00105, 6);
    expect(unitPriceCanonical(entry({ ingredientId: 'lait', price: 1.05, unit: 'kg', packSize: 1 }), MILK)).toBeNull();
    expect(packSizeCanonical(entry({ ingredientId: 'tomate', price: 3, unit: 'kg', packSize: 1 }), TOMATO)).toBe(1000);
    expect(packSizeCanonical(entry({ ingredientId: 'oeuf', price: 2, unit: 'piece', packSize: 6 }), EGG)).toBe(6);
  });
});

describe('validité et fraîcheur', () => {
  it('garde une offre qui chevauche la semaine, écarte celle qui est terminée ou trop lointaine', () => {
    expect(isEntryValid(entry({ ingredientId: 'x', price: 1, unit: 'kg', packSize: 1, validFrom: '2026-09-17', validUntil: '2026-09-23' }), WEEK)).toBe(true);
    expect(isEntryValid(entry({ ingredientId: 'x', price: 1, unit: 'kg', packSize: 1, validUntil: '2026-09-13' }), WEEK)).toBe(false);
    expect(isEntryValid(entry({ ingredientId: 'x', price: 1, unit: 'kg', packSize: 1, validFrom: '2026-09-21' }), WEEK)).toBe(false);
    expect(isEntryValid(entry({ ingredientId: 'x', price: 1, unit: 'kg', packSize: 1 }), WEEK)).toBe(true);
  });
  it('mesure l’âge du relevé en jours', () => {
    expect(priceAgeDays('2026-09-13T05:00:00.000Z', '2026-09-14')).toBe(1);
    expect(priceAgeDays('2026-09-14T05:00:00.000Z', '2026-09-14')).toBe(0);
    expect(priceAgeDays('n/a', '2026-09-14')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('devis par magasin', () => {
  it('choisit le conditionnement qui couvre le besoin au total le plus bas', () => {
    const l = list();
    const pasta = l.items.find((i) => i.ingredientId === 'pates_penne')!;
    expect(pasta.toBuyExact).toBe(200);
    const line = bestLine(
      pasta,
      [
        entry({ ingredientId: 'pates_penne', productName: '1 kg', price: 2.5, unit: 'kg', packSize: 1 }),
        entry({ ingredientId: 'pates_penne', productName: '500 g', price: 1.49, unit: 'kg', packSize: 0.5 }),
        entry({ ingredientId: 'pates_penne', productName: '250 g', price: 0.99, unit: 'kg', packSize: 0.25 }),
      ],
      PASTA,
      WEEK,
    )!;
    expect(line.entry.productName).toBe('250 g');
    expect(line.packs).toBe(1);
    expect(line.total).toBe(0.99);
  });

  it('couvre ce qui a un relevé, liste le reste comme non couvert, sans rien inventer', () => {
    const l = list();
    const lidl = file({
      prices: [
        entry({ ingredientId: 'pates_penne', price: 1.99, unit: 'kg', packSize: 0.5 }),
        entry({ ingredientId: 'poulet_blanc', price: 4.49, unit: 'kg', packSize: 0.5 }),
        // Offre terminée : ne doit pas compter.
        entry({ ingredientId: 'tomate', price: 1, unit: 'kg', packSize: 1, validUntil: '2026-09-10' }),
      ],
    });
    const q = quoteStore(l, lidl, INGREDIENTS, WEEK);
    expect(q.lines.map((x) => x.ingredientId).sort()).toEqual(['pates_penne', 'poulet_blanc']);
    expect(q.uncovered).toEqual(expect.arrayContaining(['tomate', 'oeuf']));
    expect(q.uncovered).not.toContain('pates_penne');
    expect(q.total).toBe(1.99 + 4.49);
    expect(q.coveredCount).toBe(2);
    expect(q.coverage).toBeGreaterThan(0);
    expect(q.coverage).toBeLessThan(1);
    // Le prix indicatif n'est utilisé que pour l'écart, jamais ajouté au total.
    expect(q.indicativeTotal).toBeGreaterThan(0);
    expect(q.total).not.toBe(q.indicativeTotal);
  });

  it('retient les magasins nationaux et ceux du code postal (même département en repli), trie par couverture puis total', () => {
    const l = list();
    const national = file({ prices: [entry({ ingredientId: 'pates_penne', price: 1.99, unit: 'kg', packSize: 0.5 })] });
    const leclerc = file({
      retailer: 'leclerc',
      storeId: 'creteil',
      storeName: 'Leclerc Drive Créteil',
      postalCode: '94000',
      source: 'drive',
      prices: [
        entry({ ingredientId: 'pates_penne', price: 1.2, unit: 'kg', packSize: 0.5 }),
        entry({ ingredientId: 'poulet_blanc', price: 5.5, unit: 'kg', packSize: 0.5 }),
        entry({ ingredientId: 'oeuf', price: 2.2, unit: 'piece', packSize: 6 }),
      ],
    });
    const lyon = file({ retailer: 'auchan', storeId: 'lyon', storeName: 'Auchan Lyon', postalCode: '69000', source: 'drive', prices: leclerc.prices });
    const empty = file({ retailer: 'auchan', storeId: 'vide', storeName: 'Auchan sans relevé', postalCode: '94140', source: 'drive' });

    expect(fileMatchesPostalCode(leclerc, '94140')).toBe(true);
    expect(fileMatchesPostalCode(lyon, '94140')).toBe(false);
    expect(fileMatchesPostalCode(national, '')).toBe(true);
    expect(fileMatchesPostalCode(leclerc, '')).toBe(false);

    const quotes = compareStores(l, [national, leclerc, lyon, empty], INGREDIENTS, '94140', WEEK);
    expect(quotes.map((q) => q.storeId)).toEqual(['creteil', 'national']);
    expect(quotes[0]!.coveredCount).toBe(3);
    expect(quotes[0]!.uncovered).toContain('tomate');
    expect(quotes[0]!.uncovered).not.toContain('oeuf');
    expect(quotes[1]!.coveredCount).toBe(1);
  });

  it('un article entièrement couvert par le garde-manger n’est pas devisé', () => {
    const plan = makePlan([makeMeal(0, 'dinner', 'pates_poulet')]);
    const l = buildShoppingList({
      plan,
      dataset: DATASET,
      profile: plan.profileSnapshot,
      pantry: [{ ingredientId: 'pates_penne', quantity: 1000, addedAt: '2026-09-13', expiresAt: '2027-01-01' }],
      checked: {},
      packChoices: {},
      manualItems: [],
    });
    const q = quoteStore(l, file({ prices: [entry({ ingredientId: 'pates_penne', price: 1.99, unit: 'kg', packSize: 0.5 })] }), INGREDIENTS, WEEK);
    expect(q.lines).toEqual([]);
    expect(q.uncovered).not.toContain('pates_penne');
    expect(CHICKEN.id).toBe('poulet_blanc');
  });
});
