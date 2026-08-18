import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

// schema.sql is all `CREATE TABLE IF NOT EXISTS`, so it never alters a table that already exists
// from before a column was added — these `ALTER TABLE`s backfill those on an existing database.
// Each is applied individually and a "duplicate column" error (1060) is swallowed, so re-running
// this script stays a no-op once a column is already there.
const ALTERS = [
  "ALTER TABLE calls ADD COLUMN frequency ENUM('once', 'daily', 'weekly', 'biweekly', 'monthly') NOT NULL DEFAULT 'once' AFTER notes",
  'ALTER TABLE calls ADD COLUMN reminder_minutes_before INT NULL AFTER frequency',
  'ALTER TABLE calls ADD COLUMN recurrence_parent_id VARCHAR(36) NULL AFTER reminder_minutes_before',
  'ALTER TABLE calls ADD KEY idx_calls_recurrence_parent (recurrence_parent_id)',
  'ALTER TABLE calls ADD CONSTRAINT fk_calls_recurrence_parent FOREIGN KEY (recurrence_parent_id) REFERENCES calls(id) ON DELETE SET NULL',
];

async function migrate() {
  const sql = readFileSync(schemaPath, 'utf8');
  // multipleStatements is only turned on for this one-off DDL run, never for the app's pool.
  const conn = await mysql.createConnection({ uri: env.mysqlUrl, multipleStatements: true });
  console.log(`[migrate] connected → ${env.mysqlUrl}`);
  await conn.query(sql);
  console.log('[migrate] schema applied');

  for (const statement of ALTERS) {
    try {
      await conn.query(statement);
      console.log(`[migrate] applied: ${statement}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.errno === 1826 /* dup FK */) {
        console.log(`[migrate] already applied, skipping: ${statement}`);
      } else {
        throw err;
      }
    }
  }

  await conn.end();
}

migrate().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
