import { EPS, formatPacks, packagingsOf, perishFactor, roundToPackaging, unitPrice } from '../packaging';
import { CHICKEN, CORIANDER, EGG, OIL, PASTA } from './fixtures/ingredients';

describe('roundToPackaging', () => {
  it('380 g de pâtes → 1 paquet de 500 g', () => {
    expect(roundToPackaging(PASTA.packaging, 380)).toEqual({ packs: 1, bought: 500 });
  });

  it('tolérance EPS : 500,0000001 g → toujours 1 paquet', () => {
    expect(roundToPackaging(PASTA.packaging, 500 + EPS / 10)).toEqual({ packs: 1, bought: 500 });
    expect(roundToPackaging(PASTA.packaging, 500.1)).toEqual({ packs: 2, bought: 1000 });
  });

  it('œufs : 5 → 1 boîte de 6, 7 → 2 boîtes', () => {
    expect(roundToPackaging(EGG.packaging, 5)).toEqual({ packs: 1, bought: 6 });
    expect(roundToPackaging(EGG.packaging, 7)).toEqual({ packs: 2, bought: 12 });
  });

  it('besoin nul → rien à acheter', () => {
    expect(roundToPackaging(PASTA.packaging, 0)).toEqual({ packs: 0, bought: 0 });
    expect(roundToPackaging(PASTA.packaging, -3)).toEqual({ packs: 0, bought: 0 });
  });

  it('vrac : 380 g de poulet au pas de 100 g → 400 g', () => {
    expect(roundToPackaging(CHICKEN.packaging, 380)).toEqual({ packs: 4, bought: 400 });
  });
});

describe('prix et périssabilité', () => {
  it('unitPrice', () => {
    expect(unitPrice(PASTA.packaging)).toBeCloseTo(0.0024);
    expect(unitPrice(EGG.packaging)).toBeCloseTo(0.35);
  });

  it('perishFactor : staple 0, congelable 0,25, frais 1, longue conservation ≈ 0', () => {
    expect(perishFactor(OIL)).toBe(0);
    expect(perishFactor(CHICKEN)).toBe(0.25);
    expect(perishFactor(CORIANDER)).toBe(1);
    expect(perishFactor(EGG)).toBe(0.2);
    expect(perishFactor(PASTA)).toBe(0.05);
  });

  it('packagingsOf : défaut en premier puis alternatives', () => {
    expect(packagingsOf(EGG).map((p) => p.size)).toEqual([6, 12]);
    expect(packagingsOf(PASTA)).toHaveLength(1);
  });
});

describe('formatPacks', () => {
  it('libellés français', () => {
    expect(formatPacks(PASTA, PASTA.packaging, 1)).toBe('paquet de 500 g');
    expect(formatPacks(PASTA, PASTA.packaging, 2)).toBe('2 × paquet de 500 g');
    expect(formatPacks(EGG, EGG.packaging, 1)).toBe('boîte de 6');
    expect(formatPacks(CHICKEN, CHICKEN.packaging, 4)).toBe('400 g');
    expect(formatPacks(CORIANDER, CORIANDER.packaging, 1)).toBe('botte');
    expect(formatPacks(PASTA, PASTA.packaging, 0)).toBe('');
  });
});
