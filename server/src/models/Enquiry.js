import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

function mapEnquiry(row) {
  if (!row) return null;
  return {
    id: row.id,
    goal: row.goal,
    name: row.name,
    email: row.email,
    phone: row.phone,
    preferredSlot: row.preferred_slot,
    note: row.note,
    status: row.status,
    convertedUserId: row.converted_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEnquiry({ goal, name, email, phone, preferredSlot = null, note = null }) {
  const id = newId();
  await pool.query(
    'INSERT INTO enquiries (id, goal, name, email, phone, preferred_slot, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, goal, name, email, phone, preferredSlot, note]
  );
  return findEnquiryById(id);
}

// filter: { status? }
export async function listEnquiries(filter = {}, { skip = 0, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM enquiries${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, skip]
  );
  return rows.map(mapEnquiry);
}

export async function countEnquiries(filter = {}) {
  const where = [];
  const params = [];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM enquiries${whereSql}`, params);
  return Number(rows[0].count);
}

export async function findEnquiryById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id]);
  return mapEnquiry(rows[0]);
}

// conn: pass the caller's own transaction connection when the update is part of a larger atomic
// operation (e.g. enquiry.controller.js's Converted transition) — see User.js#createUser's own
// conn comment for why reading back needs the same connection.
export async function updateEnquiryById(id, patch, conn = pool) {
  const { sets, params } = buildSetClause(
    { status: 'status', note: 'note', convertedUserId: 'converted_user_id' },
    patch
  );
  if (sets.length) {
    await conn.query(`UPDATE enquiries SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findEnquiryById(id, conn);
}

export async function deleteEnquiryById(id) {
  const existing = await findEnquiryById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM enquiries WHERE id = ?', [id]);
  return existing;
}

export async function countEnquiriesByStatus() {
  const [rows] = await pool.query('SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status');
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

// Raw created_at timestamps for a window — bucketed into weeks in JS by the caller
// (insights.controller.js reuses its existing UTC-safe startOfWeek() helper).
export async function listEnquiryCreatedAtSince(date) {
  const [rows] = await pool.query('SELECT created_at FROM enquiries WHERE created_at >= ?', [date]);
  return rows.map((r) => r.created_at);
}
