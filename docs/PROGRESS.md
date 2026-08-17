# Progress

Last updated: 2026-08-17 (full end-to-end pass — every role's flow clicked through in a real
browser, both remaining functional gaps closed). For the detailed day-by-day build journal, see
`docs/worklog/` — this file is the current-state summary; the worklog is the history.

**Update, 2026-08-17 (session 2): closed both remaining functional gaps and did a real
end-to-end browser pass across all three roles.** The dietitian Overview dashboard was still the
Phase-1 placeholder even though its backend endpoint and client hook already existed — built the
real screen (today's calls, client count, clients list). The admin weekly-plan-builder gap was a
real broken path, not a nicety: `plans.dietitian_id` is `NOT NULL` and admin creating a plan
without an explicit `dietitian` would 500 — added a required Dietitian picker to the builder for
admin only, defaulted from the client's own assignment. Fixed a shared-screen copy bug ("Your
clients" shown to admin, who sees *all* clients). Then actually drove the real installed Chrome
(via `playwright-core`, since the Claude-in-Chrome extension is still never connected in this
environment) through every screen in all three roles plus the public enquiry funnel, and caught one
real bug purely from a screenshot: the full-size progress chart's Y-axis was clipping the leading
digit of every decimal weight label ("70.8kg" rendered as "0.8kg") — a narrow `YAxis width` losing
to SVG clipping at the container edge, invisible from reading the code or from a text-content
assertion. Fixed. Full account, including what was verified and how, in
`docs/worklog/2026-08-17.md`'s Session 2.

**Update, 2026-08-17 (session 1): admin can now create and manage users directly, and clients can
choose their own dietitian.** `/app/users` (admin-only) lists every account with role-tab filtering
and lets admin create a client/dietitian/admin account or edit an existing one's role and
dietitian assignment; the client Overview has a "Your dietitian" card that prompts an unassigned
client to pick one from a live directory, or shows/lets them change their current one. Backend:
`GET /users` now also serves clients (forced to a dietitian-only directory, never other
clients/admins), and every write path that sets `assignedDietitian` validates the target is a real
`role:dietitian` account, not just any user id. Full account in `docs/worklog/2026-08-17.md`.

**Update, 2026-08-16: the app is live in production for the first time.** Client on Netlify
(`nevo-diet-planner.netlify.app`) → server on Render (`nourishly-api.onrender.com`) → MySQL on
Railway, all connected and verified end-to-end: logged in as a seeded client through the actual
browser, confirmed real data renders, and confirmed the session survives a full page reload —
directly verifying the cross-origin `sameSite: 'none'` refresh-cookie behavior that had been
flagged since Phase 8 as never checked against a real deployment (see "Known gaps" below, now
resolved). Also landed earlier the same day: the MySQL migration (written and tested 2026-08-12,
finally committed and pushed), a switch of the client deploy target from Vercel to Netlify, and a
re-check of `docs/API.md` against the live route files (no changes needed). Full account,
including the Railway public-vs-private connection string gotcha, in
`docs/worklog/2026-08-16.md`.

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
logins for all three roles) **and is now actually deployed**: Netlify client
(`nevo-diet-planner.netlify.app`) + Render server (`nourishly-api.onrender.com`) + Railway MySQL,
verified end-to-end as of 2026-08-16.

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

**Dietitian portal** — Dashboard (today's calls, client count, recently-logged-progress count,
today's calls list, clients list — replaced the placeholder 2026-08-17), Recipe library
(search/filter/CRUD), Weekly plan builder (`@dnd-kit` drag-and-drop from a recipe rail onto meal
slots, autosave, publish — every dropzone is *also* an independent accessible `Select`, not
drag-only; admin sees an additional required Dietitian picker, a dietitian caller doesn't),
Clients list with a lazy-loaded detail drawer, Schedule calls, Report reviews (reply to a client's
feedback thread).

**Admin portal** — Business overview KPIs, Enquiry pipeline as a kanban with real drag-and-drop
*and* per-card dropdown status transitions (same accessible dual-path pattern as the plan
builder), Growth insights (real 8-week enquiry volume, pipeline-stage breakdown, and dietitian
workload charts — no more empty placeholders), **Manage users** (create client/dietitian/admin
accounts, edit an existing user's role and dietitian assignment — added 2026-08-17).

**Client ↔ dietitian assignment** — a client can browse the dietitian directory and pick (or
change) who they work with from their Overview screen; admin can also assign/reassign a client to
a dietitian from Manage users. Added 2026-08-17.

**Deploy & polish** — `server/Dockerfile`, `client/netlify.toml` (SPA redirects), root `README.md`
with Netlify/Render/Railway steps and a production `.env` checklist, route-level code splitting
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
- **2026-08-17**: a *different* bug in the same `WeightTrendChart.jsx` component the 2026-08-11 fix
  touched — the full-size Progress screen's Y-axis was clipping the leading digit of every decimal
  tick label ("70.8kg" rendered as "0.8kg") because `width={36}` wasn't enough room for a 6-char
  label combined with that variant's zero left margin, so recharts positioned the text past the
  container's clipped edge. Only visible with real decimal weight data in a real screenshot — a
  text-content assertion wouldn't have caught it, since the text was technically present in the
  DOM, just visually truncated. Fixed by widening to `48`.

## Known gaps (flagged, not silently decided)

- A keyboard-only pass (Tab/Space/Arrow keys, no mouse) of both drag-and-drop surfaces, and an
  independent confirmation of the enquiry kanban's drag specifically (only inferred working from
  the plan builder's identical underlying mechanism) — see `docs/worklog/2026-08-11.md`.
- The marketing site itself is still the Phase 1 scaffold placeholder, not the ported
  `legacy/index.html` — Phase 2 was never actually done as a dedicated phase. This is the one
  remaining gap across the whole app as of 2026-08-17; everything else in this list below it is
  either resolved, a deliberate call, or infra/ops rather than app functionality. The enquiry modal
  the homepage launches *does* work end-to-end (verified 2026-08-17) — it's specifically the visual
  page around it that's unported.
- No production-safe first-admin bootstrap flow — `npm run seed` is the dev-only stand-in (the
  admin "Manage users" screen lets an existing admin create more admins, but doesn't help bootstrap
  the very first one).
- A keyboard-only (Tab/Space, no mouse) pass of the admin Manage-users dialogs and the client
  dietitian-picker dialog specifically hasn't been done — they use the same Radix `Dialog`/`Select`
  primitives already keyboard-accessible elsewhere in the app, but that hasn't been independently
  re-confirmed for these three. See `docs/worklog/2026-08-17.md` session 2.
- Report file storage is local disk (`server/uploads/`), which is ephemeral on most PaaS hosts —
  fine for a demo, needs S3/R2 (or a persistent disk) for real use.
- No automated test suite.
- Two more Lighthouse color-contrast findings remain, deliberately not fixed: white text on the
  `coral` primary button (2.82:1) and `sage-deep` eyebrow labels (3.13:1) both fall under WCAG
  AA's 4.5:1 threshold — but both are CLAUDE.md §4's *exact specified brand colors* against the
  *exact specified* cream background, not implementation bugs. Fixing them would mean deviating
  from "preserve the visual design... this is a port, not a redesign," which isn't a call to make
  silently. Flagging for whoever owns the brand palette to decide.
- Netlify deploy previews (a different URL per PR/branch) will fail CORS against a
  single-origin `CLIENT_ORIGIN` production API — noted in the README, not solved.
- Two abandoned duplicate Render services (`nourishly-api-32tp`, `nourishly-api-8a63`) exist from
  earlier failed Blueprint-apply attempts, both in a failed state — safe to delete, left for the
  user to remove.
- Render's Shell and persistent disks both require a paid plan; the project is staying on
  `plan: free`, so one-off scripts (`db:migrate`, `seed`) against production have to be run from a
  local machine with `MYSQL_URL` pointed at the production database, not from Render itself.
- Operational note, not app code: on this Windows dev machine, stopping a background `npm run
  dev`/`vite preview` task through the harness's task-stop mechanism did not reliably kill the
  underlying OS process across this project's sessions — by Phase 8 this had accumulated over 30
  orphaned `node.exe` processes competing for CPU. Cleaned up during Phase 8; worth checking for
  again in any future session on this machine (`Get-Process node`).

## Session index

One line per work session, newest first. Links to `docs/worklog/YYYY-MM-DD.md`.

- [2026-08-17](worklog/2026-08-17.md) — **Session 2**: built the real dietitian dashboard
  (replacing the placeholder), added the required admin dietitian-picker to the plan builder
  (closing a real 500-on-create bug), fixed an admin/dietitian shared-screen copy bug, then clicked
  through all three roles plus the public enquiry funnel in a real browser (`playwright-core` +
  system Chrome) and fixed a real Y-axis label-clipping bug in the progress chart found via
  screenshot. **Session 1**: admin can create/manage users (client, dietitian, admin accounts) from
  a new `/app/users` screen, and clients can browse dietitians and pick/change who they work with
  from Overview; backend `assignedDietitian` writes validate the target is a real dietitian.
- [2026-08-16](worklog/2026-08-16.md) — Committed and pushed the MySQL migration that had sat
  uncommitted since 2026-08-12; fixed a local `node --watch` restart loop that was causing login
  connection resets; prepped `render.yaml` for deploy (added then reverted a persistent disk for
  uploads, staying on the free plan); re-verified `docs/API.md` needed no changes; switched the
  client deploy target from Vercel to Netlify (user-requested) — `vercel.json` → `netlify.toml`,
  README/ARCHITECTURE updated. Then, once the user had connected Netlify, Render, and Railway
  themselves: got the Claude in Chrome extension connected for the first time on this project,
  fixed a stale `MONGO_URI`→`MYSQL_URL` env var and a Railway private-vs-public connection-string
  mixup, redeployed the server, ran `db:migrate`/`seed` against production from a local machine
  (Render's Shell needs a paid plan), and verified the whole chain live in a real browser —
  including that the session survives a page reload, resolving the cross-origin cookie risk
  flagged since Phase 8.
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
