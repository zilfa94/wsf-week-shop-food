/**
 * Décodeur minimal du format `devalue` (utilisé par Nuxt pour sérialiser `__NUXT_DATA__`).
 * Le payload est un tableau de valeurs ; les objets et tableaux y référencent leurs enfants
 * par index. Les nombres négatifs sont des sentinelles (-1 undefined, -3 NaN…).
 * Les enveloppes Vue (`["Reactive", i]`, `["Ref", i]`…) sont déballées.
 */

const WRAPPERS = new Set(['Reactive', 'ShallowReactive', 'Ref', 'ShallowRef', 'EmptyRef', 'EmptyShallowRef']);

export function unflatten(values: unknown[]): unknown {
  const cache = new Map<number, unknown>();

  const hydrate = (index: number): unknown => {
    if (index === -1) return undefined;
    if (index === -2) return undefined; // trou de tableau
    if (index === -3) return NaN;
    if (index === -4) return Infinity;
    if (index === -5) return -Infinity;
    if (index === -6) return -0;
    if (cache.has(index)) return cache.get(index);
    const v = values[index];
    if (v === null || typeof v !== 'object') {
      cache.set(index, v);
      return v;
    }
    if (Array.isArray(v)) {
      if (typeof v[0] === 'string') {
        const tag = v[0];
        if (WRAPPERS.has(tag)) {
          const inner = typeof v[1] === 'number' ? hydrate(v[1]) : undefined;
          cache.set(index, inner);
          return inner;
        }
        if (tag === 'Date') {
          const d = typeof v[1] === 'string' ? new Date(v[1]) : new Date(NaN);
          cache.set(index, d);
          return d;
        }
        if (tag === 'Set' || tag === 'Map' || tag === 'Object' || tag === 'RegExp' || tag === 'BigInt' || tag === 'null') {
          // Non utilisés par les données produit : on renvoie une forme inerte.
          const out = tag === 'Set' || tag === 'Map' ? [] : null;
          cache.set(index, out);
          return out;
        }
      }
      const arr: unknown[] = [];
      cache.set(index, arr);
      for (const child of v) arr.push(typeof child === 'number' ? hydrate(child) : child);
      return arr;
    }
    const obj: Record<string, unknown> = {};
    cache.set(index, obj);
    for (const [key, child] of Object.entries(v as Record<string, unknown>)) {
      obj[key] = typeof child === 'number' ? hydrate(child) : child;
    }
    return obj;
  };

  return hydrate(0);
}

/** Parcourt récursivement une valeur hydratée et renvoie les objets qui satisfont `predicate`. */
export function collectObjects(root: unknown, predicate: (o: Record<string, unknown>) => boolean): Record<string, unknown>[] {
  const seen = new Set<object>();
  const out: Record<string, unknown>[] = [];
  const walk = (v: unknown): void => {
    if (v === null || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    const o = v as Record<string, unknown>;
    if (predicate(o)) out.push(o);
    for (const x of Object.values(o)) walk(x);
  };
  walk(root);
  return out;
}
