/** API publique du core (fonctions pures). Le store et les écrans importent d'ici. */
export * from './types';
export { AISLE_ORDER, aisleRank } from './aisles';
export * from './date';
export { indexIngredients, indexRecipes, type IngredientIndex, type RecipeIndex } from './dataset';
export * from './filter';
export * from './labels';
export { cookWithPantry, isNotableLeftover, pantryQuantities, recipeFeasibility, suggestLeftoverUses, type LeftoverArgs } from './leftovers';
export { recipeNeeds } from './needs';
export * from './nutrition';
export * from './packaging';
export * from './params';
export { generateWeekPlan, usablePantry } from './planner';
export * from './plan-edit';
export { sharedSavings, weekReport, type WeekReportArgs } from './report';
export { mulberry32, type Rng } from './rng';
export {
  addPurchasesToPantry,
  buildShoppingList,
  consumeFromPantry,
  diffShoppingLists,
  itemKey,
  pantryAvailable,
  wasteScore,
  type BuildShoppingListArgs,
} from './shopping';
export { applySwap, suggestSwaps, type SwapArgs } from './swap';
export * from './units';
