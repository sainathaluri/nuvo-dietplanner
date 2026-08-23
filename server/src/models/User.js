import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// program_plan_name is only present when the caller asked for it via the LEFT JOIN below (mirrors
// Call.js's dietitian_name/client_name populate pattern).
function mapUser(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    phone: row.phone,
    address: row.address,
    qualifications: row.qualifications,
    accountStatus: row.account_status,
    assignedDietitian: row.assigned_dietitian_id,
    refreshTokenVersion: row.refresh_token_version,
    mustChangePassword: !!row.must_change_password,
    programPlan: row.program_plan_id,
    planDuration: row.plan_duration,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.program_plan_name !== undefined && row.program_plan_id) {
    user.programPlan = { _id: row.program_plan_id, name: row.program_plan_name };
  }
  return user;
}

const SELECT_WITH_PROGRAM_PLAN = `SELECT u.*, pp.name AS program_plan_name FROM users u
   LEFT JOIN program_plans pp ON pp.id = u.program_plan_id`;

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUser(rows[0]);
}

// conn defaults to the pool but accepts a transaction connection (see
// availabilityGuard.js#getDietitianTimezone) so a caller already inside a transaction reads a
// consistent snapshot instead of opening a second, unrelated pool connection.
export async function findUserById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT_WITH_PROGRAM_PLAN} WHERE u.id = ? LIMIT 1`, [id]);
  return mapUser(rows[0]);
}

export async function createUser(
  {
    name,
    email,
    passwordHash,
    role,
    phone = null,
    address = null,
    qualifications = null,
    assignedDietitian = null,
    mustChangePassword = false,
    programPlan = null,
    planDuration = null,
  },
  conn = pool
) {
  const id = newId();
  await conn.query(
    `INSERT INTO users
      (id, name, email, password_hash, role, phone, address, qualifications, assigned_dietitian_id, must_change_password, program_plan_id, plan_duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, passwordHash, role, phone, address, qualifications, assignedDietitian, mustChangePassword, programPlan, planDuration]
  );
  return findUserById(id, conn);
}

// filter: { role?, assignedDietitian? }
export async function listUsers(filter = {}) {
  const where = [];
  const params = [];
  if (filter.role) {
    where.push('u.role = ?');
    params.push(filter.role);
  }
  if (filter.assignedDietitian !== undefined) {
    where.push('u.assigned_dietitian_id = ?');
    params.push(filter.assignedDietitian);
  }
  const sql = `${SELECT_WITH_PROGRAM_PLAN}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
  const [rows] = await pool.query(sql, params);
  return rows.map(mapUser);
}

// patch may include: name, email, phone, address, qualifications, accountStatus, role,
// assignedDietitian, programPlan, planDuration, timezone
export async function updateUser(id, patch) {
  const columns = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    qualifications: 'qualifications',
    accountStatus: 'account_status',
    role: 'role',
    assignedDietitian: 'assigned_dietitian_id',
    programPlan: 'program_plan_id',
    planDuration: 'plan_duration',
    timezone: 'timezone',
  };
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

// Kept separate from updateUser: that function's patch is driven by a client-facing allowlist
// (PATCH /users/:id, PATCH /users/me) that must never accept a raw password hash.
export async function setPassword(id, { passwordHash, mustChangePassword }) {
  await pool.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [
    passwordHash,
    mustChangePassword,
    id,
  ]);
  return findUserById(id);
}

// Invalidates every refresh token issued before the call (see utils/jwt.js#verifyRefreshToken /
// auth.controller.js#refresh, which reject a token whose tokenVersion doesn't match this column).
export async function bumpRefreshTokenVersion(id) {
  await pool.query('UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = ?', [id]);
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
