# API reference

Base URL: `http://localhost:4000/api` (`VITE_API_URL` in `client/.env`).

Auth column: **Public** / **Auth** (any logged-in role) / role names = only those roles. "Own"
means the controller filters to resources owned by / assigned to the caller.

## Auth — `server/src/routes/auth.routes.js`

Self-registration does not exist — there is no public account-creation endpoint. Every account is
created by an admin (`POST /users`, below).

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/auth/login` | Public | `{email, password}` → `{accessToken, user}` + refresh cookie |
| POST | `/auth/forgot-password` | Public, rate-limited (5 / 15 min / IP) | `{email}` → `{message}` — always the same generic response whether or not the email is registered; if it is, emails a reset link via Resend (`server/src/utils/email.js`) |
| POST | `/auth/reset-password` | Public | `{token, password}` → `204` — validates the emailed token (hashed, unused, unexpired), sets the new password, invalidates the token, and bumps `refreshTokenVersion` (any existing session is logged out). Does **not** touch `mustChangePassword` — a still-set forced-change flag is enforced separately on the caller's next request |
| POST | `/auth/refresh` | Public (cookie) | — → `{accessToken}` |
| POST | `/auth/logout` | Auth | — → clears refresh cookie |
| GET | `/auth/me` | Auth | — → `{user}` |
| POST | `/auth/change-password` | Auth (incl. a caller whose `mustChangePassword` is still `true` — the one exception to the block below) | `{currentPassword, newPassword}` → `{accessToken, user}` + refresh cookie — verifies `currentPassword`, sets `newPassword`, clears `mustChangePassword`, reissues tokens |

Every route below except the ones above requires `mustChangePassword: false` on the caller —
`403` otherwise (`blockIfMustChangePassword` middleware, mounted right after `authenticate` on
every other router). The `user` object returned by `/auth/login`, `/auth/me`, and the `/users`
routes now includes `mustChangePassword`.

## Users — `user.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/users` | admin, dietitian, client | `?role=&assignedDietitian=` → `[user]` — dietitian is forced to own clients; client is forced to `role=dietitian` (directory browse only, ignores other filters) |
| GET | `/users/:id` | admin, dietitian(own), self | → `{user}` |
| PATCH | `/users/me` | Auth | `{name?, phone?, assignedDietitian?}` → `{user}` — `assignedDietitian` settable only by clients, and only to a real `role:dietitian` id (`400` otherwise) |
| PATCH | `/users/:id` | admin | `{role?, assignedDietitian?, programPlan?, planDuration?, ...}` → `{user}` — `assignedDietitian` validated against a real `role:dietitian` id; `programPlan`/`planDuration` only applied when `role:client` (cleared if the patch changes role away from client) |
| POST | `/users` | admin | `{name, email, password, role, assignedDietitian?, programPlan?, planDuration?}` → `{user}` — `assignedDietitian`/`programPlan`/`planDuration` only applied when `role:client`; `assignedDietitian` validated against a real `role:dietitian` id; `mustChangePassword` is always set `true` (forces a change on the new account's first login) |

Every `user` object now includes `programPlan` (`null`, or `{_id, name}` populated via a join when
set — see Program Plans below) and `planDuration` (a free string from a fixed client-side list —
`1 month`/`3 months`/`6 months`/`12 months` — not itself a validated enum server-side beyond that
list). Both are only meaningful for `role: 'client'`.

## Program Plans — `programPlan.routes.js`

A named service/program a client can be enrolled in (e.g. "Weight Loss") — entirely separate from
the `plans`/`plan_meals` weekly meal-plan tables below. Automatically visible to every dietitian
(no per-dietitian ownership). Admin can create/edit/activate-deactivate — no delete endpoint.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/program-plans` | admin, dietitian | `?activeOnly=true` (admin only — dietitian requests are always forced active-only server-side) → `[{name, description, active}]` |
| POST | `/program-plans` | admin | `{name, description?}` → `{plan}` (`active` defaults `true`) |
| PATCH | `/program-plans/:id` | admin | `{name?, description?, active?}` → `{plan}` |

## Enquiries — `enquiry.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/enquiries` | Public, rate-limited (5 / 15 min / IP) | `{goal, name, email, phone, preferredSlot?, note?}` → `{enquiry}` |
| GET | `/enquiries` | admin | `?status=&page=&limit=` → `{enquiries[], total, page, pages}` |
| GET | `/enquiries/:id` | admin | → `{enquiry}` |
| GET | `/enquiries/:id/history` | admin | → `[{status, note, call, createdAt}]` — the full, immutable, append-only timeline (never paginated); `call` is only set on a `follow-up` entry that booked a real call |
| PATCH | `/enquiries/:id` | admin | Body shape depends on `status` (a zod discriminated union — see below) → `{enquiry}`. Every transition appends one `enquiry_history` row; nothing is ever overwritten except the enquiry's own single `note` column, which always reflects the *latest* note |
| DELETE | `/enquiries/:id` | admin | → `204` |

Each `enquiry` now also has `convertedUserId` (`null` until the lead gets a real client account —
see below). `PATCH /enquiries/:id`'s payload by `status`:
- `'new'` — no extra fields.
- `'contacted'` — `{note}` (required — the conversation summary).
- `'closed'` (labelled **"Unsuccessful"** in the UI — no separate enum value) — `{note}` (required — the reason).
- `'follow-up'` — `{dietitian, scheduledAt, note?, planId?, planDuration?, password?}`. Books a real
  call through the same availability service `/calls` uses (a `409` from an unavailable slot
  surfaces unchanged). The first time an enquiry reaches `follow-up` *or* `converted`, it also
  creates the lead's client account (`planId`/`planDuration`/`password` required then — enforced in
  the controller, since whether an account already exists is DB state a static schema can't see);
  a later transition reuses the existing account instead of erroring or duplicating it. The new
  account's `assignedDietitian` is the picked dietitian, `mustChangePassword: true`.
- `'converted'` — `{planId?, planDuration?, password?}`. Same account-creation as `follow-up`, minus
  any call — the new client picks a dietitian afterward via the existing self-service
  `DietitianPickerDialog`. Required only if no account exists yet.

## Plans — `plan.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/plans` | Auth (own) | `?client=&week=` → `[plan]` (meals populate `recipe`) |
| GET | `/plans/:id` | Auth (own) | → `{plan}` |
| POST | `/plans` | dietitian(own client only, `403` otherwise — `dietitian` derived from caller), admin(explicit `dietitian`) | `{client, dietitian?, title?, week, weekEnd, meals[]}` → `{plan}` |
| PATCH | `/plans/:id` | dietitian(own plan only, `403` otherwise), admin | `{title?, meals?, published?}` → `{plan}` |
| PATCH | `/plans/:id/meals/:index` | client (own) | `{completed?, swapRequested?}` → `{plan}` — client can mark a meal eaten or flag it for a swap; cannot change what the meal is |
| DELETE | `/plans/:id` | dietitian, admin | → `204` |

Each meal slot: `{day, time, mealType, recipe, completed, swapRequested, notes}`. `notes` (added
2026-08-22, spec §6) is optional free text on the meal itself — captured in the plan builder,
shown on the client profile's Meal plans tab (last 15 days) alongside date/time/recipe.

`week`/`weekEnd` (2026-08-22): Week Start Date and Week End Date, captured once when the weekly diet
is assigned. `weekEnd` must be exactly 6 days after `week` (enforced server-side, `400` otherwise) —
the client auto-computes and locks it in the UI, so a dietitian never picks it independently. Both
are immutable after creation (`updatePlanSchema` has no `week`/`weekEnd` field). Existing rows from
before this change were backfilled with `weekEnd = week + 6 days`.

## Recipes — `recipe.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/recipes` | dietitian, admin | `?mealType=&search=` → `[recipe]` |
| GET | `/recipes/:id` | dietitian, admin | → `{recipe}` |
| POST | `/recipes` | dietitian, admin | `{title, emoji?, mealType, prepTime, tags?, kcal?, protein?, ingredients, instructions}` → `{recipe}` |
| PATCH | `/recipes/:id` | dietitian, admin | partial fields → `{recipe}` |
| DELETE | `/recipes/:id` | dietitian, admin | → `204` |

`mealType` (labelled **"Category"** in the Create/Edit Recipe form) is free text, not a fixed enum
— the form offers Breakfast/Lunch/Dinner/Snack plus a "Custom" option that reveals a text input;
whatever value results is saved here as-is and appears as its own filter tab in the Recipe
Library (dynamically derived from whatever categories are actually in use, alongside the 4 fixed
ones). This is independent of `plan_meals`' own `mealType` — the weekly plan builder's slot-type
label — which stays the original fixed 4-value enum; a recipe's category has never constrained
which slot it can be dropped into.

## Calls — `call.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/calls` | Auth (own) | `?client=&from=&to=` (`client` further narrows a dietitian/admin's own results) → `[call]` (`dietitian`/`client` populated to `{_id, name}`) |
| GET | `/calls/available-slots` | client, dietitian, admin | `?date=YYYY-MM-DD&dietitian=&excludeCallId=` (client/dietitian: `dietitian` is derived, ignoring the query param; admin: `dietitian` required) → `{slots: [isoString]}` — every bookable 30-minute start on that UTC calendar day, computed live from the dietitian's availability (weekly hours + exceptions + existing calls). Pass `excludeCallId` when rescheduling so the call's own current slot doesn't count against itself. Purely informational — the real booking decision (and its 409) still happens on `POST`/`PATCH` |
| POST | `/calls` | client, dietitian, admin | client: `{scheduledAt, notes?, reminderMinutesBefore?}` (server derives `client`/`dietitian` from the caller's `assignedDietitian`, `400` if none set); dietitian: `{client, scheduledAt, notes?, reminderMinutesBefore?, force?}` (server sets `dietitian` to self); admin: `{client, dietitian, scheduledAt, notes?, reminderMinutesBefore?, force?}` → `{call}`. Validated against the dietitian's availability (see `/availability` below) — `409` on a conflict. `force: true` (dietitian/admin only, ignored for a client) bypasses the check |
| PATCH | `/calls/:id` | dietitian(own), admin, client(own) | client may only send `{scheduledAt?}` (reschedule), `{status: 'cancelled'}` (cancel), or `{reminderMinutesBefore?}` on a still-`scheduled` call — `403`/`400` otherwise; dietitian/admin → `{scheduledAt?, status?, notes?, reminderMinutesBefore?, force?}` → `{call}`. A `scheduledAt` change re-runs the same availability check as `POST` (same `force` rule) — cancelling, completing, or editing notes/reminders doesn't |
| DELETE | `/calls/:id` | dietitian, admin | → `204` |

Each call: `{scheduledAt, status, notes, reminderMinutesBefore, originalScheduledAt,
rescheduledAt}`. The last two (added 2026-08-22, spec §6) are server-set, never client-supplied: a
reschedule updates the same row's `scheduledAt` in place rather than creating a new record, so
without them there'd be no trace a call was ever moved. `PATCH /calls/:id` stamps `rescheduledAt`
to "now" and, the first time only, copies the call's prior `scheduledAt` into
`originalScheduledAt`, whenever the new `scheduledAt` genuinely differs from the current one. The
client profile's Calls tab uses `rescheduledAt != null` to show a "Rescheduled" badge alongside
whichever of Upcoming/Previous/Completed/Cancelled the call currently falls into. `reminderMinutesBefore` (minutes,
or `null` for no reminder) drives an in-app pop-up reminder — see
`client/src/hooks/useCallReminders.js`, which polls the caller's own calls client-side and fires a
Sonner toast once per call when "now" enters its reminder window. No push notifications, no real
telephony integration — see "Known gaps" below. `useCalls()` (the main calls-list query) also polls
every 20s so a booking/reschedule by one party becomes visible to the other without a manual reload.

The recurring "Repeat call" auto-scheduling feature (`frequency`/`recurrenceParentId` columns,
`server/src/jobs/callScheduler.js`) was removed completely on 2026-08-22 — every call is one-off.
Booking now goes through a slot picker (`GET /calls/available-slots`) instead of a free-form
date/time input, so a doomed time can no longer be submitted in the first place.

**Availability validation (added 2026-08-22)**: `POST /calls` and `PATCH /calls/:id` (on a
`scheduledAt` change) run a fixed-30-minute-slot check — `server/src/services/availability.js`
(pure conflict logic) + `server/src/services/availabilityGuard.js` (fetches the dietitian's real
rows and takes a concurrency-safe row lock) — against, in order: any `kind: 'closed'` exception
covering the slot (`409`, "blocked"), the weekly template or a covering `kind: 'open'` exception
(`409`, "outside working hours" — skipped entirely if the dietitian has never configured any
weekly-hours rows, so this never silently locks out an existing dietitian), and any other
still-`scheduled` call for that dietitian overlapping the slot (`409`, "overlap" — back-to-back
appointments, where one ends exactly when the next starts, are allowed). The concurrent-booking
race (two requests for the same/overlapping slot at once) is closed with a real `SELECT ... FOR
UPDATE` range lock inside a transaction, not just an application-level check — see the comment in
`availabilityGuard.js` for the InnoDB locking details.

## Availability — `availability.routes.js`

Dietitian self-service only — no admin-on-behalf-of path. Every route requires role `dietitian`.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/availability/weekly-hours` | dietitian | → `[{weekday, startTime, endTime}]` — the caller's own recurring template, one row per open weekday (0=Sunday..6=Saturday); no rows at all means "never configured," not "closed every day" (see the Calls note above) |
| PUT | `/availability/weekly-hours` | dietitian | `{days: [{weekday, startTime, endTime}]}` (whole-template replace — delete all + reinsert, max 7 rows, no duplicate weekday, `endTime > startTime`) → `[{weekday, startTime, endTime}]` |
| GET | `/availability/exceptions` | dietitian | `?from=&to=` → `[{startAt, endAt, kind, note}]` — `kind` is `'closed'` (blocks a date, a time within a day, or a multi-day holiday/personal period — all the same shape at different spans) or `'open'` (grants hours outside/instead of the weekly template, e.g. an extra Saturday) |
| POST | `/availability/exceptions` | dietitian | `{startAt, endAt, kind, note?}` (`endAt > startAt`) → `{exception}` |
| DELETE | `/availability/exceptions/:id` | dietitian | → `204` — no update endpoint; the client deletes and recreates a row instead of editing one in place |

## Progress — `progress.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/progress` | Auth (own) | `?client=` (dietitian: only their assigned client, `403` otherwise; admin: any) → `[progress]` |
| POST | `/progress` | client | `{date, weight, waist?, hip?, thigh?, upperArm?, energy?, adherence?}` → `{progress}` |
| PATCH | `/progress/:id` | client(own), admin | → `{progress}` |
| DELETE | `/progress/:id` | client(own), admin | → `204` |

`waist`/`hip`/`thigh`/`upperArm` (cm) are all optional per entry, independent of each other and of
`weight` — a client can log any subset. History is append-only in the UI (no edit affordance on
past entries); `PATCH`/`DELETE` exist for admin correction only.

## Client Notes — `clientNote.routes.js` (added 2026-08-22)

Free-standing notes about a client — spec §6 item 6, deliberately separate from `calls.notes`
(tied to one call) and `reports.note` (tied to one report). Every route requires role `dietitian`
or `admin`; a dietitian is scoped to their own assigned clients (`403` otherwise via
`assertDietitianOwnsClient`, same helper `/progress` and `/plans` already use), admin can access
any client's notes.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/client-notes` | dietitian(own client), admin | `?client=` (required) → `[note]`, newest first |
| POST | `/client-notes` | dietitian(own client), admin | `{client, body}` → `{note}` (`author` set to the caller) |
| PATCH | `/client-notes/:id` | author, admin | `{body}` → `{note}` — `403` for any other dietitian, even one assigned to the client |
| DELETE | `/client-notes/:id` | author, admin | → `204` |

Each note: `{client, author, authorName, body, createdAt, updatedAt}`.

## Messages — `message.routes.js` (added 2026-08-22)

Client <-> assigned dietitian messaging (spec §1.5). Every route requires role `client` or
`dietitian` — **admin is excluded entirely** (`403`), since admin isn't a party to any
conversation. Conversation identity is the `(client, dietitian)` pair itself — there is no
separate conversations resource — and it is always re-derived server-side from the *current*
`assignedDietitian` relationship, never trusted from a request param: a client caller can never
specify who they're messaging (always their own assigned dietitian, `400` if none set), and a
dietitian caller must specify `client`, and can only ever address one they're currently assigned
to (`403` via `assertDietitianOwnsClient` otherwise — the one enforcement point every route below
shares, so there's exactly one place this check can be gotten wrong, not five). If a client is
later reassigned to a different dietitian, the old thread becomes inaccessible to both the old
dietitian (no longer owns the client) and the client (their own lookup now resolves to the new
dietitian) — a conversation is scoped to the relationship, not preserved as a historical record.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/messages` | client(own), dietitian(own client) | client: none; dietitian: `?client=` (required) → `[message]`, oldest first (chat order) |
| POST | `/messages` | client(own), dietitian(own client) | client: `{body}`; dietitian: `{client, body}` → `{message}`, `201` |
| POST | `/messages/read` | client(own), dietitian(own client) | client: `{}`; dietitian: `{client}` → `204` — marks every message in the conversation not sent by the caller as read; call when a thread is opened |
| GET | `/messages/unread-count` | client, dietitian | → `{count}` — client: unread in their one conversation; dietitian: total across every conversation (see `/conversations` for the per-conversation breakdown) |
| GET | `/messages/conversations` | dietitian only | → `[{client: {_id, name}, lastMessage: {body, sender, createdAt} \| null, unreadCount}]` — one row per currently-assigned client (even with zero messages, so a dietitian can start one), ordered most-recently-active first then alphabetically |

Each message: `{client, dietitian, sender, body, readAt, createdAt}`. `readAt` is a single
timestamp (not per-party) since a 1:1 thread's each message has exactly one possible reader — the
sender never needs to "read" their own message. No edit/delete — a chat history is immutable.
Polling only (`refetchInterval`, 15s on the thread/conversation list, matching the cadence already
used for calls/reminders) — no websocket infrastructure was added, per the spec's explicit steer.

## Reports — `report.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/reports` | Auth (own) | `?client=` (dietitian: only their assigned client, `403` otherwise; no `?client=` defaults to all of the dietitian's own clients; admin: any/all) → `[report]` (`client` populated to `{_id, name}`, each has a `feedback[]` thread) |
| POST | `/reports` | client | `multipart/form-data {file, note?}` → `{report}` (status `pending`) |
| POST | `/reports/:id/feedback` | dietitian, admin | `{message, status?}` → `{report}` — appends one entry to `feedback[]` and sets `status` (default `reviewed`) |
| DELETE | `/reports/:id` | client(own), admin | → `204` |

Each report: `{client, fileName, filePath, note, status, feedback: [{author, authorName, message, createdAt}]}`.

## Insights — `insights.routes.js`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/insights/admin-overview` | admin | `{newEnquiries, followUpsToday, conversionRate, activeClients, growthSeries: [{week, enquiries}] (last 8 weeks, real aggregation, zero-filled), dietitianWorkload: [{dietitian, clients}], statusBreakdown: [{status, count}]}` |
| GET | `/insights/dietitian-overview` | dietitian | `{todaysAppointments[], attentionItems[], clientMomentum}` |

## Known gaps (flagged, not silently decided)

- `Report` file storage is local disk (`server/uploads/`) for now — swap for S3 when decided.
- `attentionItems` on `/insights/dietitian-overview` still returns an empty placeholder — the
  dietitian-side overview dashboard itself is still unbuilt (Phase 5 placeholder), so there's no
  UI consuming this yet. `admin-overview`'s `growthSeries` is real as of Phase 8.
- Call reminders (2026-08-19) are still explicitly a testing-stage feature: client-side polling +
  an in-app toast only, not a push notification or an actual phone call. (The recurring
  "Repeat call" auto-scheduling half of that 2026-08-19 work was removed completely on 2026-08-22
  — see the Calls section above.)
- Availability (2026-08-22): a requested slot must fit entirely inside one continuous window — the
  weekly template's window for that day, or one covering `open` exception — they aren't merged, so
  e.g. a template ending at noon plus a same-day `open` exception starting at noon wouldn't be
  treated as one continuous window for a slot straddling noon. `start_time`/`end_time`/`start_at`/
  `end_at` are UTC wall-clock, the same convention `calls.scheduled_at` already uses. Availability
  management is dietitian self-service only — no admin-on-behalf-of path yet.
- No repo-wide automated test suite — `server/tests/` (added 2026-08-22, `node --test`) covers only
  the new availability service: `npm run test:unit` is pure-logic and DB-free, `npm test` also runs
  a real-MySQL integration test for the concurrent-booking race and needs a local database matching
  `server/.env`.
- Program Plans (2026-08-22) has no admin-on-behalf-of-a-dietitian editing concept and no delete
  endpoint — matches the spec's literal "create, edit, activate/deactivate" scope.
- Enquiry pipeline (2026-08-22): a client created via "Converted" (not "Follow-up") gets no
  dietitian assignment — they self-assign one after first login via the existing
  `DietitianPickerDialog`, same as any other admin-created, unassigned client. The weekly plan
  builder's own slot-type dropdown (Breakfast/Lunch/Snack/Dinner) is intentionally unrelated to a
  recipe's (now free-text) category, and stays a fixed 4-value enum.
