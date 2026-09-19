/**
 * Générateur pseudo-aléatoire déterministe (mulberry32). Le core n'utilise jamais
 * `Math.random()` : toute source d'aléa est un `Rng` créé à partir d'une `seed` injectée.
 */

/** Renvoie un nombre dans [0, 1). */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier dans [0, n). */
export function randomInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Élément aléatoire d'un tableau non vide (undefined si vide). */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  return items.length === 0 ? undefined : items[randomInt(rng, items.length)];
}

/** Copie mélangée (Fisher-Yates), l'original n'est pas modifié. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
