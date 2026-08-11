// Read-model helpers for the client portal screens (Overview/Meals/Progress/Calls) — kept out of
// components per CLAUDE.md §3 ("no business logic in components").
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getTodayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function parseTimeToMinutes(time) {
  const [clock, meridiem] = time.split(' ');
  let [hours, minutes] = clock.split(':').map(Number);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
}

export function groupMealsByDay(plan) {
  const map = Object.fromEntries(WEEKDAYS.map((day) => [day, []]));
  for (const meal of plan?.meals ?? []) {
    (map[meal.day] ??= []).push(meal);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }
  return map;
}

// The "up next" meal for today: the earliest not-yet-eaten meal, or the day's first meal if
// everything is already marked eaten.
export function getTodayHighlightMeal(plan) {
  const todaysMeals = groupMealsByDay(plan)[getTodayName()];
  if (!todaysMeals?.length) return null;
  return todaysMeals.find((meal) => !meal.completed) ?? todaysMeals[0];
}

export function computeMealCompletion(plan) {
  const meals = plan?.meals ?? [];
  return { completed: meals.filter((meal) => meal.completed).length, total: meals.length };
}

export function splitCalls(calls) {
  const now = Date.now();
  const upcoming = [];
  const past = [];
  for (const call of calls ?? []) {
    if (call.status === 'scheduled' && new Date(call.scheduledAt).getTime() >= now) upcoming.push(call);
    else past.push(call);
  }
  upcoming.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  past.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  return { upcoming, past };
}

export function getNextCall(calls) {
  return splitCalls(calls).upcoming[0] ?? null;
}

export function computeProgressStats(entries) {
  if (!entries?.length) return null;
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const first = sorted[0];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    sorted,
    latest,
    previous,
    weightChangeTotal: latest.weight - first.weight,
    weightChangeRecent: previous ? latest.weight - previous.weight : 0,
    energyChangeRecent: previous && latest.energy != null && previous.energy != null ? latest.energy - previous.energy : null,
    checkInsLast30Days: sorted.filter((entry) => new Date(entry.date).getTime() >= thirtyDaysAgo).length,
  };
}
