import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    phone: row.phone,
    assignedDietitian: row.assigned_dietitian_id,
    refreshTokenVersion: row.refresh_token_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUser(rows[0]);
}

export async function findUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUser(rows[0]);
}

export async function createUser({ name, email, passwordHash, role, phone = null }) {
  const id = newId();
  await pool.query(
    'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, passwordHash, role, phone]
  );
  return findUserById(id);
}

// filter: { role?, assignedDietitian? }
export async function listUsers(filter = {}) {
  const where = [];
  const params = [];
  if (filter.role) {
    where.push('role = ?');
    params.push(filter.role);
  }
  if (filter.assignedDietitian !== undefined) {
    where.push('assigned_dietitian_id = ?');
    params.push(filter.assignedDietitian);
  }
  const sql = `SELECT * FROM users${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
  const [rows] = await pool.query(sql, params);
  return rows.map(mapUser);
}

// patch may include: name, phone, role, assignedDietitian
export async function updateUser(id, patch) {
  const columns = { name: 'name', phone: 'phone', role: 'role', assignedDietitian: 'assigned_dietitian_id' };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return findUserById(id);
}

export async function countUsers(filter = {}) {
  const where = [];
  const params = [];
  if (filter.role) {
    where.push('role = ?');
    params.push(filter.role);
  }
  if (filter.assignedDietitian !== undefined) {
    where.push('assigned_dietitian_id = ?');
    params.push(filter.assignedDietitian);
  }
  const sql = `SELECT COUNT(*) AS count FROM users${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].count);
}

// [{ dietitianId, clients }] — one row per dietitian that has at least one assigned client.
export async function countUsersGroupedByDietitian() {
  const [rows] = await pool.query(
    "SELECT assigned_dietitian_id AS dietitianId, COUNT(*) AS clients FROM users WHERE role = 'client' AND assigned_dietitian_id IS NOT NULL GROUP BY assigned_dietitian_id"
  );
  return rows.map((r) => ({ dietitianId: r.dietitianId, clients: Number(r.clients) }));
}

export async function listClientIdsByDietitian(dietitianId) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role = 'client' AND assigned_dietitian_id = ?",
    [dietitianId]
  );
  return rows.map((r) => r.id);
}
