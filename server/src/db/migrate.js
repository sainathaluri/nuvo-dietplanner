import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

async function migrate() {
  const sql = readFileSync(schemaPath, 'utf8');
  // multipleStatements is only turned on for this one-off DDL run, never for the app's pool.
  const conn = await mysql.createConnection({ uri: env.mysqlUrl, multipleStatements: true });
  console.log(`[migrate] connected → ${env.mysqlUrl}`);
  await conn.query(sql);
  console.log('[migrate] schema applied');
  await conn.end();
}

migrate().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
