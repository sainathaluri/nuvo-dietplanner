import { pool } from '../db/pool.js';

// ZenX admin-server is the source of truth for company identity (see auth.controller.js#handoff's
// claim-shape comment) — wellness-app just mirrors the fields it needs locally so users.company_id
// has something to point its FK at. Upserted on every handoff, not just first-time, so a rename in
// ZenX (company_name/slug/logo_url) propagates here instead of freezing at first SSO.
export async function upsertCompanyFromHandoff({ id, name, slug, logoUrl }) {
  await pool.query(
    `INSERT INTO companies (id, name, slug, logo_url)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), logo_url = VALUES(logo_url)`,
    [id, name, slug, logoUrl]
  );
}
