import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

// timezone: 'Z' makes mysql2 treat every DATE/DATETIME value as UTC in both directions — the app
// (and its data, e.g. week-start dates) is UTC-everywhere by convention already (see the UTC
// comments in insights.controller.js and seed.js, added after a real local-timezone bug there).
// Without this, the driver would serialize JS Date values using the server host's local offset,
// silently shifting calendar days for anyone not already running in UTC.
export const pool = mysql.createPool({ uri: env.mysqlUrl, timezone: 'Z' });

// Wraps a set of writes that touch more than one table (e.g. a plan and its meals) in a single
// transaction — mysql2 has no ORM-level unit-of-work, so callers get a connection explicitly.
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
