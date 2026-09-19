/** Sélecteurs purs : ils renvoient des références brutes de l'état (jamais d'objet neuf → pas de boucle de rendu). */
import type { AppState } from './types';

export const selectProfile = (s: AppState) => s.profile;
export const selectPlan = (s: AppState) => s.currentPlan;
export const selectPreviousPlan = (s: AppState) => s.previousPlan;
export const selectPantry = (s: AppState) => s.pantry;
export const selectChecked = (s: AppState) => s.checked;
export const selectPackChoices = (s: AppState) => s.packChoices;
export const selectManualItems = (s: AppState) => s.manualItems;
export const selectSettings = (s: AppState) => s.settings;
export const selectHasOnboarded = (s: AppState) => s.settings.hasOnboarded;
export const selectThemeMode = (s: AppState) => s.settings.themeMode;
