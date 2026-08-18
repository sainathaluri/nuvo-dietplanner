import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const CALL_COLUMNS = {
  scheduledAt: 'scheduled_at',
  status: 'status',
  notes: 'notes',
  frequency: 'frequency',
  reminderMinutesBefore: 'reminder_minutes_before',
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
    frequency: row.frequency,
    reminderMinutesBefore: row.reminder_minutes_before,
    recurrenceParentId: row.recurrence_parent_id,
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

export async function findCallById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, du.name AS dietitian_name
     FROM calls c
     JOIN users du ON du.id = c.dietitian_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return mapCall(rows[0]);
}

export async function createCall({
  client,
  dietitian,
  scheduledAt,
  notes = null,
  frequency = 'once',
  reminderMinutesBefore = null,
  recurrenceParentId = null,
}) {
  const id = newId();
  await pool.query(
    `INSERT INTO calls
      (id, client_id, dietitian_id, scheduled_at, notes, frequency, reminder_minutes_before, recurrence_parent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, client, dietitian, scheduledAt, notes, frequency, reminderMinutesBefore, recurrenceParentId]
  );
  return findCallById(id);
}

// Rolling-generation-only lookup for the scheduler (server/src/jobs/callScheduler.js): every call
// still 'scheduled', still recurring, whose time has passed. Not scoped to any one client/dietitian
// — the scheduler runs for the whole table on a timer.
export async function listDueRecurringCalls() {
  const [rows] = await pool.query(
    "SELECT * FROM calls WHERE status = 'scheduled' AND frequency != 'once' AND scheduled_at <= NOW()"
  );
  return rows.map(mapCall);
}

export async function updateCallById(id, patch) {
  const { sets, params } = buildSetClause(CALL_COLUMNS, patch);
  if (sets.length) {
    await pool.query(`UPDATE calls SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findCallById(id);
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
