/** Invariants du référentiel d'ingrédients (docs/SPEC.md § 3.2 et § 3.4). */
import { AISLE_ORDER } from '../../core/aisles';
import type { Aisle, Allergen, CanonicalUnit, FoodClass, Season, Unit } from '../../core/types';
import { INGREDIENTS } from '../ingredients';

const AISLES = new Set<Aisle>(AISLE_ORDER);
const CANONICAL = new Set<CanonicalUnit>(['g', 'ml', 'piece']);
const UNITS = new Set<Unit>(['g', 'ml', 'piece', 'kg', 'l', 'cl', 'tbsp', 'tsp', 'pinch', 'bunch', 'clove', 'slice', 'can', 'sachet', 'handful']);
const FOOD_CLASSES = new Set<FoodClass>(['plant', 'egg', 'dairy', 'honey', 'fish', 'shellfish', 'poultry', 'beef', 'pork', 'lamb', 'other_meat']);
const ALLERGENS = new Set<Allergen>(['gluten', 'crustaceans', 'egg', 'fish', 'peanut', 'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs']);
const SEASONS = new Set<Season>(['spring', 'summer', 'autumn', 'winter']);
const ID_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

/** Accumule les violations pour un rapport lisible (Jest n'accepte pas de message dans `expect`). */
function collect(check: (fail: (message: string) => void) => void): string[] {
  const problems: string[] = [];
  check((m) => problems.push(m));
  return problems;
}

describe('ingrédients', () => {
  it('au moins 120 ingrédients, ids uniques en snake_case sans accent', () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(120);
    const ids = INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !ID_RE.test(id))).toEqual([]);
  });

  it('chaque ingrédient est complet et cohérent', () => {
    const problems = collect((fail) => {
      for (const ing of INGREDIENTS) {
        const w = `${ing.id} :`;
        if (ing.name.trim().length === 0 || ing.name !== ing.name.trim()) fail(`${w} nom vide ou non nettoyé`);
        if (!AISLES.has(ing.aisle)) fail(`${w} rayon inconnu ${ing.aisle}`);
        if (!CANONICAL.has(ing.canonicalUnit)) fail(`${w} unité canonique ${ing.canonicalUnit}`);
        if (!FOOD_CLASSES.has(ing.foodClass)) fail(`${w} foodClass ${ing.foodClass}`);
        for (const a of ing.allergens) if (!ALLERGENS.has(a)) fail(`${w} allergène ${a}`);
        if (new Set(ing.allergens).size !== ing.allergens.length) fail(`${w} allergène en double`);
        for (const p of [ing.packaging, ...(ing.altPackagings ?? [])]) {
          if (!(p.size > 0)) fail(`${w} taille de conditionnement`);
          if (!(p.price > 0)) fail(`${w} prix`);
          if (p.label.trim().length === 0) fail(`${w} libellé de conditionnement`);
          if (p.kind !== 'pack' && p.kind !== 'bulk') fail(`${w} kind ${String(p.kind)}`);
        }
        if (!(ing.shelfLifeDays > 0) || !Number.isInteger(ing.shelfLifeDays)) fail(`${w} shelfLifeDays`);
        for (const [unit, factor] of Object.entries(ing.conversions)) {
          if (!UNITS.has(unit as Unit)) fail(`${w} unité de conversion ${unit}`);
          if (unit === ing.canonicalUnit) fail(`${w} conversion vers l'unité canonique inutile`);
          if (!(typeof factor === 'number' && factor > 0)) fail(`${w} facteur ${unit}`);
        }
        for (const s of ing.seasons ?? []) if (!SEASONS.has(s)) fail(`${w} saison ${s}`);
        if (ing.seasons && ing.seasons.length === 0) fail(`${w} seasons vide (omettre le champ)`);
      }
    });
    expect(problems).toEqual([]);
  });

  it('cohérence classe alimentaire ↔ allergènes ↔ rayon', () => {
    const problems = collect((fail) => {
      for (const ing of INGREDIENTS) {
        const w = `${ing.id} :`;
        if (ing.foodClass === 'dairy' && !ing.allergens.includes('milk')) fail(`${w} laitage sans allergène milk`);
        if (ing.foodClass === 'egg' && !ing.allergens.includes('egg')) fail(`${w} œuf sans allergène egg`);
        if (ing.foodClass === 'fish' && !ing.allergens.includes('fish')) fail(`${w} poisson sans allergène fish`);
        if (ing.foodClass === 'shellfish' && !ing.allergens.some((a) => a === 'crustaceans' || a === 'molluscs')) fail(`${w} fruit de mer sans allergène`);
        if (ing.staple && !['condiments', 'dry_goods', 'sweet_grocery'].includes(ing.aisle)) fail(`${w} staple hors épicerie`);
        if (ing.aisle === 'butcher' && !['poultry', 'beef', 'pork', 'lamb', 'other_meat'].includes(ing.foodClass)) fail(`${w} boucherie sans classe viande`);
        if (ing.aisle === 'fish' && !['fish', 'shellfish'].includes(ing.foodClass)) fail(`${w} poissonnerie sans classe poisson`);
        if (ing.canonicalUnit === 'piece' && !Number.isInteger(ing.packaging.size)) fail(`${w} pièces avec conditionnement non entier`);
      }
    });
    expect(problems).toEqual([]);
  });

  it('couvre les besoins de base de la cuisine française', () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    const expected = [
      'sel', 'poivre', 'huile_olive', 'beurre', 'oeuf', 'lait', 'creme_fraiche', 'farine', 'sucre',
      'oignon', 'ail', 'tomate', 'carotte', 'pomme_de_terre', 'courgette', 'citron', 'persil',
      'pates', 'riz', 'pain', 'poulet_blanc', 'boeuf_hache', 'saumon', 'pois_chiches', 'lentilles', 'yaourt',
    ];
    expect(expected.filter((id) => !ids.has(id))).toEqual([]);
    const spices = INGREDIENTS.filter((i) => i.aisle === 'condiments' && i.staple);
    expect(spices.length).toBeGreaterThanOrEqual(8);
  });
});
