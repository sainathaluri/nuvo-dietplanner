import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const CALL_COLUMNS = {
  scheduledAt: 'scheduled_at',
  status: 'status',
  notes: 'notes',
  reminderMinutesBefore: 'reminder_minutes_before',
  originalScheduledAt: 'original_scheduled_at',
  rescheduledAt: 'rescheduled_at',
};

// dietitianName is only present when the caller asked for it via populate() below — mirrors
// Mongoose's .populate('dietitian', 'name') / .populate('client', 'name').
function mapCall(row) {
  if (!row) return null;
  const call = {
    id: row.id,
    client: row.client_id,
    dietitian: row.dietitian_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    notes: row.notes,
    reminderMinutesBefore: row.reminder_minutes_before,
    originalScheduledAt: row.original_scheduled_at,
    rescheduledAt: row.rescheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.dietitian_name !== undefined) call.dietitian = { _id: row.dietitian_id, name: row.dietitian_name };
  if (row.client_name !== undefined) call.client = { _id: row.client_id, name: row.client_name };
  return call;
}

// filter: { client?, dietitian?, from?, to? }
export async function listCalls(filter = {}) {
  const where = [];
  const params = [];
  if (filter.client) {
    where.push('c.client_id = ?');
    params.push(filter.client);
  }
  if (filter.dietitian) {
    where.push('c.dietitian_id = ?');
    params.push(filter.dietitian);
  }
  if (filter.from) {
    where.push('c.scheduled_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('c.scheduled_at <= ?');
    params.push(filter.to);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.*, cu.name AS client_name, du.name AS dietitian_name
     FROM calls c
     JOIN users cu ON cu.id = c.client_id
     JOIN users du ON du.id = c.dietitian_id
     ${whereSql}
     ORDER BY c.scheduled_at ASC`,
    params
  );
  return rows.map(mapCall);
}

// conn defaults to the pool but accepts a transaction connection (see availabilityGuard.js) so a
// caller can read back a row it just inserted before that transaction commits.
export async function findCallById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.*, du.name AS dietitian_name
     FROM calls c
     JOIN users du ON du.id = c.dietitian_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return mapCall(rows[0]);
}

export async function createCall(
  { client, dietitian, scheduledAt, notes = null, reminderMinutesBefore = null },
  conn = pool
) {
  const id = newId();
  await conn.query(
    `INSERT INTO calls
      (id, client_id, dietitian_id, scheduled_at, notes, reminder_minutes_before)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, client, dietitian, scheduledAt, notes, reminderMinutesBefore]
  );
  return findCallById(id, conn);
}

// The concurrency-safe read behind the availability guard: locks every still-`scheduled` call for
// this dietitian whose scheduled_at falls in (rangeStart, rangeEnd) so a concurrent transaction
// requesting an overlapping slot blocks here until this one commits or rolls back (InnoDB next-key
// locking on a `SELECT ... FOR UPDATE` indexed range, under the default REPEATABLE READ isolation
// — see server/src/services/availabilityGuard.js for the full explanation). Must run inside the
// same transaction as the eventual insert/update, hence the required `conn`.
export async function lockOverlappingCalls(dietitianId, rangeStart, rangeEnd, { excludeCallId } = {}, conn = pool) {
  const params = [dietitianId, rangeStart, rangeEnd];
  // USE INDEX forces the (dietitian_id, scheduled_at) composite index rather than leaving it to
  // the optimizer: on a small/lightly-populated table MySQL can otherwise pick the single-column
  // idx_calls_dietitian index instead, which next-key-locks every row for this dietitian regardless
  // of scheduled_at (verified via EXPLAIN) — real contention between unrelated, non-overlapping
  // bookings for the same dietitian, not just a missed optimization.
  let sql = `SELECT id, scheduled_at FROM calls USE INDEX (idx_calls_dietitian_scheduled)
     WHERE dietitian_id = ? AND status = 'scheduled' AND scheduled_at > ? AND scheduled_at < ?`;
  if (excludeCallId) {
    sql += ' AND id != ?';
    params.push(excludeCallId);
  }
  sql += ' FOR UPDATE';
  const [rows] = await conn.query(sql, params);
  return rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at }));
}

// Read-only sibling of lockOverlappingCalls — no FOR UPDATE, no transaction required — for
// displaying a day's available slots (GET /calls/available-slots). This is purely informational:
// the actual booking decision still goes through assertSlotAvailable's locked read at submit time,
// so a slot shown here can still lose a race to another booking between viewing and submitting
// (surfaced as the existing 409 conflict on submit).
export async function listScheduledCallsOnDate(dietitianId, dayStart, dayEnd, { excludeCallId } = {}, conn = pool) {
  const params = [dietitianId, dayStart, dayEnd];
  let sql = `SELECT id, scheduled_at FROM calls
     WHERE dietitian_id = ? AND status = 'scheduled' AND scheduled_at >= ? AND scheduled_at < ?`;
  if (excludeCallId) {
    sql += ' AND id != ?';
    params.push(excludeCallId);
  }
  const [rows] = await conn.query(sql, params);
  return rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at }));
}

export async function updateCallById(id, patch, conn = pool) {
  const { sets, params } = buildSetClause(CALL_COLUMNS, patch);
  if (sets.length) {
    await conn.query(`UPDATE calls SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findCallById(id, conn);
}

export async function deleteCallById(id) {
  const existing = await findCallById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM calls WHERE id = ?', [id]);
  return existing;
}

export async function countCalls(filter = {}) {
  const where = [];
  const params = [];
  if (filter.dietitian) {
    where.push('dietitian_id = ?');
    params.push(filter.dietitian);
  }
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  if (filter.from) {
    where.push('scheduled_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('scheduled_at <= ?');
    params.push(filter.to);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM calls${whereSql}`, params);
  return Number(rows[0].count);
}

// Today's appointments for one dietitian, with client name populated — used by
// insights.controller.js#dietitianOverview.
export async function listCallsForDietitianInRange(dietitianId, from, to) {
  const [rows] = await pool.query(
    `SELECT c.*, cu.name AS client_name
     FROM calls c
     JOIN users cu ON cu.id = c.client_id
     WHERE c.dietitian_id = ? AND c.scheduled_at >= ? AND c.scheduled_at <= ?`,
    [dietitianId, from, to]
  );
  return rows.map(mapCall);
}
