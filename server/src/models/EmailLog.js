import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';

// Rows stuck in 'sending' longer than this are assumed to have died with the process mid-send
// (e.g. server restart) and are reclaimed back to 'queued' by the worker's next tick.
const STUCK_SENDING_MINUTES = 5;

function mapEmailLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    to: row.to_email,
    templateKey: row.template_key,
    subject: row.subject,
    params: row.params,
    relatedEntity: row.related_entity_type ? { type: row.related_entity_type, id: row.related_entity_id } : null,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    providerMessageId: row.provider_message_id,
    error: row.error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findEmailLogById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM email_log WHERE id = ? LIMIT 1', [id]);
  return mapEmailLog(rows[0]);
}

export async function findEmailLogByIdempotencyKey(idempotencyKey, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM email_log WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
  return mapEmailLog(rows[0]);
}

// Inserts a new queued row, or — if idempotencyKey has already been used — returns the existing
// row untouched instead. This IS the idempotency guarantee: a retried job or a handler that fires
// twice always lands on the same row rather than sending twice.
export async function enqueueEmail({
  idempotencyKey,
  to,
  templateKey,
  subject,
  params,
  relatedEntity = null,
  maxAttempts,
}) {
  const id = newId();
  try {
    await pool.query(
      `INSERT INTO email_log
        (id, idempotency_key, to_email, template_key, subject, params, related_entity_type, related_entity_id, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        idempotencyKey,
        to,
        templateKey,
        subject,
        JSON.stringify(params),
        relatedEntity?.type ?? null,
        relatedEntity?.id ?? null,
        maxAttempts,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return findEmailLogByIdempotencyKey(idempotencyKey);
    throw err;
  }
  return findEmailLogById(id);
}

// filter: { status? }
export async function listEmailLogs(filter = {}, { skip = 0, limit = 50 } = {}) {
  const where = [];
  const params = [];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM email_log${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, skip]
  );
  return rows.map(mapEmailLog);
}

// Rows left in 'sending' from a process that died mid-send never get a terminal status on their
// own — this puts them back in the pickable pool so the next claimBatch() retries them, same as
// any other failed attempt (attempts is not incremented here; the actual send attempt that follows
// is what counts).
export async function reclaimStuckSendingRows() {
  await pool.query(
    `UPDATE email_log
     SET status = 'queued'
     WHERE status = 'sending' AND updated_at < DATE_SUB(NOW(3), INTERVAL ? MINUTE)`,
    [STUCK_SENDING_MINUTES]
  );
}

// Atomically claims up to `limit` due rows: SKIP LOCKED lets multiple worker ticks (or, later,
// multiple server instances) run this query concurrently without blocking on each other or
// double-claiming a row — same row-locking idiom as availabilityGuard.js's overlap check.
export async function claimBatch(limit) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT * FROM email_log
       WHERE status = 'queued' AND next_attempt_at <= NOW(3)
       ORDER BY next_attempt_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    await conn.query(`UPDATE email_log SET status = 'sending' WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    return rows.map(mapEmailLog);
  });
}

export async function markEmailSent(id, providerMessageId) {
  await pool.query(
    `UPDATE email_log SET status = 'sent', provider_message_id = ?, error = NULL, sent_at = NOW(3) WHERE id = ?`,
    [providerMessageId ?? null, id]
  );
  return findEmailLogById(id);
}

// Increments attempts and either requeues at nextAttemptAt (backoff already computed by the
// caller) or marks the row permanently 'failed' once maxAttempts is reached.
export async function markEmailRetryOrFailed(id, { error, nextAttemptAt, attempts, maxAttempts }) {
  const status = attempts >= maxAttempts ? 'failed' : 'queued';
  await pool.query(
    `UPDATE email_log SET status = ?, attempts = ?, error = ?, next_attempt_at = ? WHERE id = ?`,
    [status, attempts, String(error).slice(0, 2000), nextAttemptAt, id]
  );
  return findEmailLogById(id);
}

// Admin-triggered manual retry (emailLog.controller.js#resendEmail) — a full fresh attempt budget,
// not a continuation of the exhausted one, since an admin resending has (presumably) already
// addressed whatever caused every prior attempt to fail.
export async function requeueEmail(id) {
  await pool.query(
    `UPDATE email_log SET status = 'queued', attempts = 0, next_attempt_at = NOW(3) WHERE id = ?`,
    [id]
  );
  return findEmailLogById(id);
}
