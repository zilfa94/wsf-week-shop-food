import { UnitConversionError, formatNumber, formatPrice, formatQuantity, toCanonical } from '../units';
import { CORIANDER, EGG, FLOUR, OIL, PASTA, TOMATO } from './fixtures/ingredients';

describe('toCanonical', () => {
  it('unité canonique → identité', () => {
    expect(toCanonical(PASTA, 380, 'g')).toBe(380);
    expect(toCanonical(EGG, 3, 'piece')).toBe(3);
  });

  it('facteurs par défaut : kg, l, cl, tbsp/tsp pour un liquide', () => {
    expect(toCanonical(PASTA, 1.5, 'kg')).toBe(1500);
    expect(toCanonical(OIL, 2, 'tbsp')).toBe(30);
    expect(toCanonical(OIL, 1, 'tsp')).toBe(5);
    expect(toCanonical(OIL, 25, 'cl')).toBe(250);
    expect(toCanonical(OIL, 1, 'l')).toBe(1000);
  });

  it('conversions spécifiques de l’ingrédient', () => {
    expect(toCanonical(FLOUR, 2, 'tbsp')).toBe(16);
    expect(toCanonical(CORIANDER, 1, 'bunch')).toBe(30);
    expect(toCanonical(TOMATO, 3, 'piece')).toBe(360);
  });

  it('lève une erreur explicite si la conversion manque', () => {
    expect(() => toCanonical(PASTA, 1, 'tbsp')).toThrow(UnitConversionError);
    expect(() => toCanonical(EGG, 1, 'g')).toThrow(/oeuf en g/);
  });
});

describe('formatage français', () => {
  it('formatNumber : virgule, sans zéros inutiles', () => {
    expect(formatNumber(1.5)).toBe('1,5');
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(0.456, 2)).toBe('0,46');
  });

  it('formatPrice', () => {
    expect(formatPrice(1.5)).toBe('1,50 €');
    expect(formatPrice(78)).toBe('78,00 €');
  });

  it('formatQuantity : g/kg, ml/L, pièces accordées', () => {
    expect(formatQuantity(380, 'g')).toBe('380 g');
    expect(formatQuantity(1200, 'g')).toBe('1,2 kg');
    expect(formatQuantity(250, 'ml')).toBe('250 ml');
    expect(formatQuantity(1500, 'ml')).toBe('1,5 L');
    expect(formatQuantity(6, 'piece', EGG)).toBe('6 œufs');
    expect(formatQuantity(1, 'piece', EGG)).toBe('1 œuf');
    expect(formatQuantity(2, 'piece')).toBe('2 pièces');
  });
});
