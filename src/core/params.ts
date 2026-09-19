/**
 * Paramètres réglables de la logique métier, regroupés pour être ajustés (et testés) au même endroit.
 * Les valeurs viennent de la proposition algorithmique (docs/conception/proposition-algo.md, récapitulatif).
 */
import type { PlannerParams, PlannerParamsOverride } from './types';

/** Poids du coût (échelle « euro »), recuit simulé, diversité du glouton, batch cooking. */
export const DEFAULT_PLANNER_PARAMS: PlannerParams = {
  weights: { waste: 1, variety: 1.5, nutrition: 8, budget: 0 },
  anneal: { iterations: 4000, t0: 2, tEnd: 0.02 },
  greedyTopK: 3,
  maxBatchPerWeek: 2,
  batchBonus: 2,
};

/** Poids budget appliqué uniquement pour l'objectif `budget`. */
export const BUDGET_GOAL_WEIGHT = 0.15;

/** Fusion profonde d'une surcharge partielle avec les défauts. */
export function resolvePlannerParams(partial?: PlannerParamsOverride): PlannerParams {
  if (!partial) return DEFAULT_PLANNER_PARAMS;
  return {
    weights: { ...DEFAULT_PLANNER_PARAMS.weights, ...partial.weights },
    anneal: { ...DEFAULT_PLANNER_PARAMS.anneal, ...partial.anneal },
    greedyTopK: partial.greedyTopK ?? DEFAULT_PLANNER_PARAMS.greedyTopK,
    maxBatchPerWeek: partial.maxBatchPerWeek ?? DEFAULT_PLANNER_PARAMS.maxBatchPerWeek,
    batchBonus: partial.batchBonus ?? DEFAULT_PLANNER_PARAMS.batchBonus,
  };
}

/** Un reste n'est signalé que s'il vaut au moins ce montant (€)… */
export const LEFTOVER_MIN_VALUE = 0.3;
/** … ou représente au moins cette part du conditionnement. */
export const LEFTOVER_MIN_RATIO = 0.2;

/** Bande de tolérance sans pénalité nutritionnelle. */
export const NUTRITION_TOLERANCE = { kcal: 0.1, protein: 0.15 } as const;

/** Part du besoin journalier couverte par les repas planifiés (le reste : pain, fruits, laitages, boissons). */
export const PLANNED_SHARE = 0.72;

/** Un garde-manger « bientôt périmé » : à moins de N jours de la date limite. */
export const PANTRY_EXPIRY_WARNING_DAYS = 2;

/** Taux de faisabilité minimal pour « Cuisiner avec ce que j'ai ». */
export const FEASIBILITY_MIN_RATIO = 0.8;
