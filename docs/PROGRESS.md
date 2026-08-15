# Progress

Last updated: 2026-08-12 (database migration session). For the detailed day-by-day build
journal, see `docs/worklog/` — this file is the current-state summary; the worklog is the history.

**Update, 2026-08-12: the database is now MySQL, not MongoDB.** User-requested stack change,
confirmed explicitly before starting since CLAUDE.md pins the backend to MongoDB + Mongoose.
`server/src/models/*.js` are now hand-written SQL (`mysql2`, no ORM) over the relational schema in
`server/src/db/schema.sql`. The JSON API contract (`_id`, `createdAt`, `tags`, `feedback`, ...) was
preserved exactly, so **no client file changed** — verified end-to-end with an extensive curl
smoke test (login as all 3 roles, full CRUD across every resource, both insights endpoints) against
a live MySQL-backed server, plus a clean `npm run build` on the client. See
`docs/worklog/2026-08-12.md` for the full account, including two real bugs this surfaced (nested
`meal.recipe` missing `_id`, aggregate counts risking string instead of number) and how they were
fixed. A `migrate-from-mongo.mjs` script exists to port any real pre-migration MongoDB data but has
not yet been run against real data (none existed in this dev environment).

## Status at a glance

All eight planned phases are built: static prototype → scaffolded React/Express app → marketing
enquiry flow → real auth → authenticated portal shell → client portal → dietitian portal → admin
portal → deploy-readiness polish. The app runs locally end-to-end (seed script gives working
logins for all three roles) and is configured to deploy (Vercel client + Render/Railway server).

**Update, 2026-08-11: the app has now actually been watched running in a real browser**, for the
first time in the project's history — every prior session's worklog flagged this as the top
unverified risk. The Claude-in-Chrome automation *extension* is still never connected, but a
separate path worked: `playwright-core` driving the system's actual installed Chrome. This
surfaced two real bugs within the first twenty minutes that eight phases of build/lint/curl
verification never caught — see `docs/worklog/2026-08-11.md` for the full account:
- The client Overview screen's compact weight-trend chart rendered a real 6-week, 4.2kg decline
  as a visually flat line (a recharts Y-axis domain that was only applied to the full-size
  variant). Fixed.
- The dietitian's weekly plan builder showed a completely empty schedule for a client who had a
  real, seeded, published plan — the exact same UTC-vs-local-time `startOfWeek()` bug Phase 8
  found and fixed in `insights.controller.js`, except it turned out to exist in **two more
  places** (`client/src/lib/planBuilder.js`, `server/src/seed.js`) that fix didn't think to check
  for. Fixed both, matching the established UTC-safe pattern.
- The plan builder's `@dnd-kit` drag-and-drop was directly exercised with real, scripted mouse
  events (not just static rendering) and confirmed working end-to-end.

Both drag-and-drop surfaces, all three portals, and the full auth flow have now been visually
confirmed to render correctly and match the intended design. What's *not* yet done: a keyboard-
only pass of either drag-and-drop surface, and an independent (not inferred-by-similarity)
confirmation of the enquiry kanban's drag specifically — see that day's worklog for why.

## What's built

**Auth** — register/login/refresh/logout/me, JWT access token in memory + `httpOnly` refresh
cookie, role-aware redirects, "remember where you were going," a seed script
(`server/npm run seed`) with known credentials for all three roles plus demo data.

**Portal shell** — `/app/*` routes individually role-guarded (`RoleRoute`, sourced from one nav
config so the sidebar and the route guards can't drift apart), responsive sidebar + mobile drawer,
profile dropdown, 404 and Unauthorized pages.

**Client portal** (role: client) — Overview (today's meals, next call, progress snapshot),
This week's meals (day tabs, mark-eaten, request-swap), My progress (recharts weight trend,
milestones, log-a-new-entry), Calls (book/reschedule/cancel), Reports (upload + read the
dietitian's feedback thread).

**Dietitian portal** — Recipe library (search/filter/CRUD), Weekly plan builder (`@dnd-kit`
drag-and-drop from a recipe rail onto meal slots, autosave, publish — every dropzone is *also* an
independent accessible `Select`, not drag-only), Clients list with a lazy-loaded detail drawer,
Schedule calls, Report reviews (reply to a client's feedback thread).

**Admin portal** — Business overview KPIs, Enquiry pipeline as a kanban with real drag-and-drop
*and* per-card dropdown status transitions (same accessible dual-path pattern as the plan
builder), Growth insights (real 8-week enquiry volume, pipeline-stage breakdown, and dietitian
workload charts — no more empty placeholders).

**Deploy & polish** — `server/Dockerfile`, `client/vercel.json` (SPA rewrites), root `README.md`
with Vercel/Render/Railway steps and a production `.env` checklist, route-level code splitting
(`React.lazy`, cut the main JS bundle from one ~1.27MB chunk to a 697KB vendor chunk + ~24 small
per-route chunks), font-loading optimization (moved off a render-blocking CSS `@import` to
preconnected `<link>` tags), real meta tags + a brand favicon (replacing a leftover generic
scaffold placeholder), a `ServerErrorPage` wired as the router's `errorElement`, and a global toast
for background query failures that would otherwise fail silently.

**Real bugs found and fixed along the way** (not asked for, found while building — see the
worklog for each day's full reasoning):
- A refresh-interceptor deadlock that would have hung `isLoading` forever for any anonymous
  visitor (Session 4).
- Multiple dietitian-authorization gaps: cross-client data leaks on `Progress`/`Report` listing,
  and a complete lack of ownership checks on `Plan` create/update/delete (Sessions 6–7).
- **Phase 8**: a production-blocking bug where the refresh cookie's `sameSite: 'strict'` would
  have silently broken login persistence entirely once client and server were deployed to
  different domains — caught by reasoning through the actual deploy topology this phase asked
  for, not by any test. Also a sitewide color-contrast bug: `text-muted` had been used in ~40
  files across every phase since Session 4, believed to give readable secondary text, but a CSS
  token-name collision (`--color-muted` redefined twice — once as a raw brand hex, once by the
  shadcn semantic layer — with the second silently winning) made it resolve to a near-invisible
  light sage instead. Caught only by running a real Lighthouse accessibility audit, not by
  reading the code. Fixed at the CSS root and across all 42 affected files.
- **2026-08-11**: the client Overview's compact weight chart visually flattened a real trend
  (missing Y-axis domain on the compact variant only), and the same `startOfWeek()`
  UTC-vs-local-time bug fixed once in Phase 8 turned out to exist in two more places
  (`planBuilder.js`, `seed.js`), breaking the plan builder's schedule entirely for any client with
  a seeded plan. Both caught only by actually opening the app in a real browser — see above.

## Known gaps (flagged, not silently decided)

- A keyboard-only pass (Tab/Space/Arrow keys, no mouse) of both drag-and-drop surfaces, and an
  independent confirmation of the enquiry kanban's drag specifically (only inferred working from
  the plan builder's identical underlying mechanism) — see `docs/worklog/2026-08-11.md`.
- The marketing site itself is still the Phase 1 scaffold placeholder, not the ported
  `legacy/index.html` — Phase 2 was never actually done as a dedicated phase.
- Dietitian's own Overview dashboard is still a placeholder (client and admin have real ones).
- Admin can't fully use the weekly plan builder yet — `createPlan` needs an explicit `dietitian`
  field that only admin (not the derived dietitian-caller path) must supply, and the builder UI
  has no dietitian-picker.
- No production-safe first-admin bootstrap flow — `npm run seed` is the dev-only stand-in.
- Report file storage is local disk (`server/uploads/`), which is ephemeral on most PaaS hosts —
  fine for a demo, needs S3/R2 (or a persistent disk) for real use.
- No automated test suite.
- Two more Lighthouse color-contrast findings remain, deliberately not fixed: white text on the
  `coral` primary button (2.82:1) and `sage-deep` eyebrow labels (3.13:1) both fall under WCAG
  AA's 4.5:1 threshold — but both are CLAUDE.md §4's *exact specified brand colors* against the
  *exact specified* cream background, not implementation bugs. Fixing them would mean deviating
  from "preserve the visual design... this is a port, not a redesign," which isn't a call to make
  silently. Flagging for whoever owns the brand palette to decide.
- Vercel preview deployments (a different URL per PR/branch) will fail CORS against a
  single-origin `CLIENT_ORIGIN` production API — noted in the README, not solved.
- Operational note, not app code: on this Windows dev machine, stopping a background `npm run
  dev`/`vite preview` task through the harness's task-stop mechanism did not reliably kill the
  underlying OS process across this project's sessions — by Phase 8 this had accumulated over 30
  orphaned `node.exe` processes competing for CPU. Cleaned up during Phase 8; worth checking for
  again in any future session on this machine (`Get-Process node`).

## Session index

One line per work session, newest first. Links to `docs/worklog/YYYY-MM-DD.md`.

- [2026-08-12](worklog/2026-08-12.md) — Migrated the database from MongoDB/Mongoose to MySQL
  (`mysql2`, hand-written SQL, no ORM), user-requested. Preserved the JSON API contract exactly so
  no client file changed; verified with an extensive curl smoke test against a live MySQL-backed
  server. Fixed two real bugs found along the way (nested recipe missing `_id`, aggregate counts
  risking string instead of number).
- [2026-08-11](worklog/2026-08-11.md) — First real in-browser verification of the whole project
  (`playwright-core` driving the system's installed Chrome). Found and fixed two real bugs (a
  flattened chart, a plan-builder-breaking timezone bug in two more places than Phase 8 caught),
  and directly confirmed the plan builder's drag-and-drop works with real mouse events.
- [2026-08-10](worklog/2026-08-10.md) — Phases 1 (verification) through 8, all in one day across
  eight sessions: scaffold verification → enquiry flow → auth → portal shell → client portal →
  dietitian portal → admin portal → deploy & polish. Full detail, including every decision,
  problem hit, and bug found, is in that file's eight `## Session N` entries.
- [2026-08-09](worklog/2026-08-09.md) — Phase 1: repo init, legacy files moved to `legacy/`, full
  API + folder-structure plan approved, `client/` and `server/` scaffolded and building.
