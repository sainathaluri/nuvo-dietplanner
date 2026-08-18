import { listDueRecurringCalls, createCall, updateCallById } from '../models/Call.js';

const TICK_MS = 60_000;

const STEP_DAYS = { daily: 1, weekly: 7, biweekly: 14 };

function nextOccurrence(scheduledAt, frequency) {
  const next = new Date(scheduledAt);
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + STEP_DAYS[frequency]);
  }
  return next;
}

// Rolls each due recurring call forward exactly once: inserts the next occurrence (same
// client/dietitian/frequency/reminder/notes, same time-of-day) and flips the original row's
// `frequency` to 'once' so this tick's WHERE clause never picks it up again — the new row carries
// recurrence forward from here. A call that got cancelled before its time never reaches this query
// (status != 'scheduled'), which is what stops a series: cancel one occurrence, the chain ends.
async function tick() {
  const due = await listDueRecurringCalls();
  for (const call of due) {
    const dietitianId = call.dietitian?._id ?? call.dietitian;
    const clientId = call.client?._id ?? call.client;
    try {
      await createCall({
        client: clientId,
        dietitian: dietitianId,
        scheduledAt: nextOccurrence(call.scheduledAt, call.frequency),
        notes: call.notes,
        frequency: call.frequency,
        reminderMinutesBefore: call.reminderMinutesBefore,
        recurrenceParentId: call.recurrenceParentId ?? call.id,
      });
      await updateCallById(call.id, { frequency: 'once' });
    } catch (err) {
      console.error(`[callScheduler] failed to roll forward call ${call.id}`, err);
    }
  }
}

// Testing-stage feature — see docs/API.md "Calls" and schema.sql's comment on the `calls` table.
// No queue/lock: fine for one server instance, which is all this app runs today.
export function startCallScheduler() {
  tick().catch((err) => console.error('[callScheduler] initial tick failed', err));
  const timer = setInterval(() => {
    tick().catch((err) => console.error('[callScheduler] tick failed', err));
  }, TICK_MS);
  timer.unref();
  return timer;
}
