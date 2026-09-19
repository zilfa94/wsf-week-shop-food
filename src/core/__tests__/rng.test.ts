import { mulberry32, pick, randomInt, shuffle } from '../rng';

describe('rng', () => {
  it('est déterministe : même seed → même séquence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sa = Array.from({ length: 10 }, () => a());
    const sb = Array.from({ length: 10 }, () => b());
    expect(sa).toEqual(sb);
  });

  it('produit des séquences différentes pour des seeds différentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });

  it('reste dans [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randomInt reste dans [0, n)', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(rng, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick renvoie undefined sur un tableau vide', () => {
    expect(pick(mulberry32(1), [])).toBeUndefined();
    expect(pick(mulberry32(1), ['x'])).toBe('x');
  });

  it('shuffle conserve les éléments sans muter l’original', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(mulberry32(9), src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
