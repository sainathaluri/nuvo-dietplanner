import { pool } from '../db/pool.js';

// ZenX admin-server is the source of truth for company identity (see auth.controller.js#handoff's
// claim-shape comment) — wellness-app just mirrors the fields it needs locally so users.company_id
// has something to point its FK at. Upserted on every handoff, not just first-time, so a rename in
// ZenX (company_name/slug/website/logo_url) propagates here instead of freezing at first SSO.
//
// `website` is COALESCE'd rather than overwritten: a token minted by an admin-server that predates
// the website claim carries `undefined` there, and blindly writing that would wipe a value a newer
// token had already mirrored. A real clearing on the ZenX side sends an explicit null, which is
// indistinguishable from "absent" in JSON — accepted, since a stale-but-correct link is a better
// failure than one that disappears every other login during a rolling deploy.
export async function upsertCompanyFromHandoff({ id, name, slug, website, logoUrl }) {
  await pool.query(
    `INSERT INTO companies (id, name, slug, website, logo_url)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       slug = VALUES(slug),
       website = COALESCE(VALUES(website), website),
       logo_url = VALUES(logo_url)`,
    [id, name, slug, website ?? null, logoUrl]
  );
}

export async function findCompanyById(id) {
  const [rows] = await pool.query('SELECT id, name, slug, website, logo_url FROM companies WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

// Two callers, both needing the slug -> company resolution: the unauthenticated branding lookup on
// a slug-scoped login page (company.controller.js#getPublicCompany) and the tenant check on login
// (auth.controller.js#login). `status` is here for the latter — getPublicCompany whitelists the
// fields it echoes back (name, slug, logo) rather than spreading this row, so a logged-out visitor
// still learns nothing beyond the branding they already have the URL for.
//
// Slug comparison is case-insensitive: `companies.slug` is UNIQUE under utf8mb4's default
// case-insensitive collation, so `/ABC-Nutrition` and `/abc-nutrition` resolve to the same tenant
// rather than one of them silently failing to resolve at all.
export async function findCompanyBySlug(slug) {
  const [rows] = await pool.query('SELECT id, name, slug, logo_url, status FROM companies WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ?? null;
}
