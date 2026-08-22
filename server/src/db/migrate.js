import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

// schema.sql is all `CREATE TABLE IF NOT EXISTS`, so it never alters a table that already exists
// from before a column was added — these `ALTER TABLE`s backfill those on an existing database.
// Each is applied individually and a "duplicate column"/"already exists" error is swallowed (see
// the catch below), so re-running this script stays a no-op once a change is already there.
const ALTERS = [
  // Position fixed to `AFTER notes` (not the now-removed `frequency` column it originally
  // followed) — see the 2026-08-22 DROP entries below for why `frequency` is gone.
  'ALTER TABLE calls ADD COLUMN reminder_minutes_before INT NULL AFTER notes',
  // Default FALSE, not TRUE — see the comment on this column in schema.sql.
  'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER refresh_token_version',
  // See the comment above this key in schema.sql — without it, the availability guard's locking
  // range query falls back to idx_calls_dietitian alone and over-locks.
  'ALTER TABLE calls ADD KEY idx_calls_dietitian_scheduled (dietitian_id, scheduled_at)',
  // 2026-08-22: Repeat Call removed completely, including its schema — reverses the
  // frequency/recurrence_parent_id ALTERs a prior migration ran (this array only ever appends, it
  // never edits an already-shipped entry in place, so the original ADDs are replaced by explicit
  // DROPs here rather than deleted from history). Order matters: FK, then its index, then the
  // columns.
  'ALTER TABLE calls DROP FOREIGN KEY fk_calls_recurrence_parent',
  'ALTER TABLE calls DROP KEY idx_calls_recurrence_parent',
  'ALTER TABLE calls DROP COLUMN recurrence_parent_id',
  'ALTER TABLE calls DROP COLUMN frequency',
  // Program Plans (2026-08-22): program_plans itself is a brand-new table, created via
  // schema.sql's own CREATE TABLE IF NOT EXISTS — only the new users columns need backfilling here.
  'ALTER TABLE users ADD COLUMN program_plan_id VARCHAR(36) NULL AFTER must_change_password',
  'ALTER TABLE users ADD COLUMN plan_duration VARCHAR(50) NULL AFTER program_plan_id',
  'ALTER TABLE users ADD KEY idx_users_program_plan (program_plan_id)',
  'ALTER TABLE users ADD CONSTRAINT fk_users_program_plan FOREIGN KEY (program_plan_id) REFERENCES program_plans(id) ON DELETE SET NULL',
  // Recipe Category + Custom (2026-08-22): relax the fixed 4-value ENUM to free text — see the
  // comment on this column in schema.sql. A MODIFY COLUMN re-applying an already-matching
  // definition is a harmless no-op in MySQL (no error to swallow), unlike ADD/DROP above.
  'ALTER TABLE recipes MODIFY COLUMN meal_type VARCHAR(50) NOT NULL',
  // Enquiry history / Follow-up / Converted (2026-08-22): enquiry_history itself is a brand-new
  // table, created via schema.sql's own CREATE TABLE IF NOT EXISTS — only this new enquiries
  // column needs backfilling here.
  'ALTER TABLE enquiries ADD COLUMN converted_user_id VARCHAR(36) NULL AFTER status',
  'ALTER TABLE enquiries ADD KEY idx_enquiries_converted_user (converted_user_id)',
  'ALTER TABLE enquiries ADD CONSTRAINT fk_enquiries_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL',
  // Week Start/End Date (2026-08-22): nullable in the ALTER since existing rows have no value to
  // backfill (schema.sql declares it NOT NULL for fresh installs only, same asymmetry as the other
  // backfilled columns above). The UPDATE is plain idempotent DML — its own WHERE guard makes
  // re-running it a no-op, so it needs no error-code swallowing like the DDL statements above.
  'ALTER TABLE plans ADD COLUMN week_end DATE NULL AFTER week',
  'ALTER TABLE plans ADD KEY idx_plans_week_end (week_end)',
  'UPDATE plans SET week_end = DATE_ADD(week, INTERVAL 6 DAY) WHERE week_end IS NULL',
  // Progress body measurements (spec §3.1): all nullable, same asymmetry as the other backfilled
  // columns above — existing rows simply have no value for a measurement they never recorded.
  'ALTER TABLE progress ADD COLUMN waist DECIMAL(6, 2) NULL AFTER weight',
  'ALTER TABLE progress ADD COLUMN hip DECIMAL(6, 2) NULL AFTER waist',
  'ALTER TABLE progress ADD COLUMN thigh DECIMAL(6, 2) NULL AFTER hip',
  'ALTER TABLE progress ADD COLUMN upper_arm DECIMAL(6, 2) NULL AFTER thigh',
  // Client profile centrepiece (spec §6): meal notes, call reschedule tracking. client_notes
  // itself is a brand-new table, created via schema.sql's own CREATE TABLE IF NOT EXISTS.
  'ALTER TABLE plan_meals ADD COLUMN notes TEXT NULL AFTER swap_requested',
  'ALTER TABLE calls ADD COLUMN original_scheduled_at DATETIME(3) NULL AFTER reminder_minutes_before',
  'ALTER TABLE calls ADD COLUMN rescheduled_at DATETIME(3) NULL AFTER original_scheduled_at',
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
      // 1060/1061/1826 = adding something that's already there (duplicate column/key/FK); 1091 =
      // dropping something that was never there (unknown column/key/FK) — both directions mean
      // this exact statement's effect already matches the current schema, so skip it.
      if (
        err.code === 'ER_DUP_FIELDNAME' ||
        err.code === 'ER_DUP_KEYNAME' ||
        err.errno === 1826 /* dup FK */ ||
        err.errno === 1091 /* ER_CANT_DROP_FIELD_OR_KEY */
      ) {
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
