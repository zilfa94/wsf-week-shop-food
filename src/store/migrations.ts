/**
 * Migrations et assainissement de l'état persisté. Au moindre doute (plan généré avec un autre jeu
 * de données, recette disparue, forme inattendue), on repart d'une valeur sûre plutôt que de planter.
 */
import { DATASET } from '@/data';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, type PersistedState } from './types';

export const STORE_VERSION = 1;

const RECIPE_IDS = new Set(DATASET.recipes.map((r) => r.id));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Un plan n'est conservé que s'il correspond au jeu de données embarqué. */
export function sanitizePlan(plan: unknown): PersistedState['currentPlan'] {
  if (!isRecord(plan) || typeof plan['id'] !== 'string' || !Array.isArray(plan['meals'])) return null;
  if (plan['datasetVersion'] !== DATASET.version) return null;
  const meals = plan['meals'] as { recipeId?: unknown }[];
  if (meals.some((m) => typeof m?.recipeId !== 'string' || !RECIPE_IDS.has(m.recipeId))) return null;
  return plan as unknown as PersistedState['currentPlan'];
}

/** Complète les champs manquants avec les défauts et rejette ce qui est incohérent. */
export function sanitizePersisted(raw: unknown): PersistedState {
  const p = isRecord(raw) ? raw : {};
  const record = (v: unknown) => (isRecord(v) ? v : {});
  return {
    profile: { ...DEFAULT_PROFILE, ...record(p['profile']) } as PersistedState['profile'],
    currentPlan: sanitizePlan(p['currentPlan']),
    seed: typeof p['seed'] === 'number' && Number.isFinite(p['seed']) ? p['seed'] : 1,
    checked: record(p['checked']) as PersistedState['checked'],
    packChoices: record(p['packChoices']) as PersistedState['packChoices'],
    manualItems: record(p['manualItems']) as PersistedState['manualItems'],
    pantry: Array.isArray(p['pantry']) ? (p['pantry'] as PersistedState['pantry']) : [],
    settings: { ...DEFAULT_SETTINGS, ...record(p['settings']) } as PersistedState['settings'],
  };
}

/** Table des migrations : `version` du state lu → transformation. Chaînées jusqu'à `STORE_VERSION`. */
const MIGRATIONS: Readonly<Record<number, (state: Record<string, unknown>) => Record<string, unknown>>> = {
  // 0 → 1 : première forme persistée ; rien à transformer, l'assainissement suffit.
  0: (state) => state,
};

export function migratePersisted(persisted: unknown, version: number): PersistedState {
  let state = isRecord(persisted) ? persisted : {};
  for (let v = version; v < STORE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) state = step(state);
  }
  return sanitizePersisted(state);
}
