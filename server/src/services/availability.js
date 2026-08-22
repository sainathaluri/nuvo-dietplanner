// Pure conflict-detection core for the availability feature — no DB access, so it's cheap and
// deterministic to unit test (server/tests/unit/availability.test.js covers every branch here).
// The impure orchestrator that fetches real rows and takes the concurrency-safe lock lives in
// availabilityGuard.js.

export const CALL_DURATION_MINUTES = 30;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

// 'HH:MM' or 'HH:MM:SS' (mysql2 returns TIME columns as strings) -> minutes since midnight.
function parseTimeToMinutes(value) {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

function minutesSinceUtcMidnight(date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

// [aStart, aEnd) intersects [bStart, bEnd) — half-open ranges, so touching endpoints (back-to-back)
// are NOT an overlap.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function fail(reason, message) {
  return { ok: false, reason, message };
}

// workingHours: [{ weekday: 0-6, startTime: 'HH:MM', endTime: 'HH:MM' }]
// exceptions: [{ startAt, endAt, kind: 'closed' | 'open', note? }]
// existingCalls: [{ id, scheduledAt }] — already scoped to this dietitian's still-`scheduled` calls
// requestedStart: Date | ISO string
// durationMinutes: number, defaults to CALL_DURATION_MINUTES
export function checkAvailability({
  workingHours = [],
  exceptions = [],
  existingCalls = [],
  requestedStart,
  durationMinutes = CALL_DURATION_MINUTES,
}) {
  const start = toDate(requestedStart);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  // 1. Explicit blocks always win, regardless of the weekly template or any 'open' exception —
  // a lunch-break block on an otherwise-open day still blocks that slot.
  const blockingException = exceptions.find(
    (ex) => ex.kind === 'closed' && rangesOverlap(start, end, toDate(ex.startAt), toDate(ex.endAt))
  );
  if (blockingException) {
    return fail('blocked', blockingException.note ? `Blocked: ${blockingException.note}` : 'This time is blocked');
  }

  // 2. An 'open' exception that fully covers the requested slot grants availability regardless of
  // the weekly template (e.g. extra hours on a normally-closed date).
  const coveringOpenException = exceptions.find(
    (ex) => ex.kind === 'open' && toDate(ex.startAt) <= start && toDate(ex.endAt) >= end
  );

  if (!coveringOpenException) {
    // 3. Fall back to the weekly template. No rows at all = never configured = unrestricted
    // (see the schema.sql comment on dietitian_weekly_hours for why this must be opt-in).
    if (workingHours.length > 0) {
      const weekday = start.getUTCDay();
      const dayHours = workingHours.find((wh) => wh.weekday === weekday);
      if (!dayHours) return fail('outside_hours', 'Outside working hours');

      const slotStartMin = minutesSinceUtcMidnight(start);
      const slotEndMin = slotStartMin + durationMinutes;
      const openMin = parseTimeToMinutes(dayHours.startTime);
      const closeMin = parseTimeToMinutes(dayHours.endTime);
      if (slotStartMin < openMin || slotEndMin > closeMin) {
        return fail('outside_hours', 'Outside working hours');
      }
    }
  }

  // 4. Overlap with an existing call. Half-open ranges make back-to-back appointments (one ends
  // exactly when the other starts) allowed, not a conflict.
  const conflictingCall = existingCalls.find((call) => {
    const callStart = toDate(call.scheduledAt);
    const callEnd = new Date(callStart.getTime() + durationMinutes * 60_000);
    return rangesOverlap(start, end, callStart, callEnd);
  });
  if (conflictingCall) {
    return fail('overlap', 'This time overlaps an existing call');
  }

  return { ok: true };
}

// Enumerates every bookable slot start on one UTC calendar day, reusing checkAvailability(...) as
// the single source of truth — a slot is listed here if and only if booking it would actually
// succeed, so "shown as available" can never drift from "actually bookable" at the moment of
// viewing. date: 'YYYY-MM-DD'. Returns an array of ISO datetime strings.
export function listAvailableSlots({ workingHours = [], exceptions = [], existingCalls = [], date, durationMinutes = CALL_DURATION_MINUTES }) {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const stepMs = durationMinutes * 60_000;

  const slots = [];
  for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
    const candidate = new Date(t);
    const result = checkAvailability({ workingHours, exceptions, existingCalls, requestedStart: candidate, durationMinutes });
    if (result.ok) slots.push(candidate.toISOString());
  }
  return slots;
}
