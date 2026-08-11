import { WEEKDAYS } from './clientPortal';

// UTC-based deliberately, matching server/src/controllers/insights.controller.js's fix for the
// same bug: local-time Date methods + .toISOString() shift the computed Monday by a day in any
// timezone ahead of UTC (e.g. IST), so this and the server's stored `Plan.week` — which must
// compare equal for the plan builder to find an existing plan — silently disagreed. Found by
// actually loading the plan builder for a client with a seeded plan and seeing an empty schedule.
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().slice(0, 10);
}

let localId = 0;
export function createBlankMeal(day = WEEKDAYS[0]) {
  return { localId: `new-${++localId}`, day, time: '8:00 AM', mealType: 'Breakfast', recipeId: null };
}

// Server meal slot → local editable row (adds a stable localId for React keys/dnd-kit ids since
// the server's subdocuments have no _id of their own).
export function toLocalMeal(meal) {
  return {
    localId: `saved-${++localId}`,
    day: meal.day,
    time: meal.time,
    mealType: meal.mealType,
    recipeId: meal.recipe?._id ?? meal.recipe ?? null,
  };
}

// Local editable row → the shape the API expects.
export function toApiMeal({ day, time, mealType, recipeId }) {
  return { day, time, mealType, recipe: recipeId };
}
