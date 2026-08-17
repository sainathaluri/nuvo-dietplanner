# API reference

Base URL: `http://localhost:4000/api` (`VITE_API_URL` in `client/.env`).

Auth column: **Public** / **Auth** (any logged-in role) / role names = only those roles. "Own"
means the controller filters to resources owned by / assigned to the caller.

## Auth — `server/src/routes/auth.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/auth/register` | Public | `{name, email, password}` → creates `role:client` → `{user}` + refresh cookie + `{accessToken}` |
| POST | `/auth/login` | Public | `{email, password}` → `{accessToken, user}` + refresh cookie |
| POST | `/auth/refresh` | Public (cookie) | — → `{accessToken}` |
| POST | `/auth/logout` | Auth | — → clears refresh cookie |
| GET | `/auth/me` | Auth | — → `{user}` |

## Users — `user.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/users` | admin, dietitian, client | `?role=&assignedDietitian=` → `[user]` — dietitian is forced to own clients; client is forced to `role=dietitian` (directory browse only, ignores other filters) |
| GET | `/users/:id` | admin, dietitian(own), self | → `{user}` |
| PATCH | `/users/me` | Auth | `{name?, phone?, assignedDietitian?}` → `{user}` — `assignedDietitian` settable only by clients, and only to a real `role:dietitian` id (`400` otherwise) |
| PATCH | `/users/:id` | admin | `{role?, assignedDietitian?, ...}` → `{user}` — `assignedDietitian` validated against a real `role:dietitian` id |
| POST | `/users` | admin | `{name, email, password, role, assignedDietitian?}` → `{user}` — `assignedDietitian` only applied when `role:client`, validated as above |

## Enquiries — `enquiry.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/enquiries` | Public, rate-limited (5 / 15 min / IP) | `{goal, name, email, phone, preferredSlot?, note?}` → `{enquiry}` |
| GET | `/enquiries` | admin | `?status=&page=&limit=` → `{enquiries[], total, page, pages}` |
| GET | `/enquiries/:id` | admin | → `{enquiry}` |
| PATCH | `/enquiries/:id` | admin | `{status?, note?}` → `{enquiry}` |
| DELETE | `/enquiries/:id` | admin | → `204` |

## Plans — `plan.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/plans` | Auth (own) | `?client=&week=` → `[plan]` (meals populate `recipe`) |
| GET | `/plans/:id` | Auth (own) | → `{plan}` |
| POST | `/plans` | dietitian(own client only, `403` otherwise — `dietitian` derived from caller), admin(explicit `dietitian`) | `{client, dietitian?, title?, week, meals[]}` → `{plan}` |
| PATCH | `/plans/:id` | dietitian(own plan only, `403` otherwise), admin | `{title?, meals?, published?}` → `{plan}` |
| PATCH | `/plans/:id/meals/:index` | client (own) | `{completed?, swapRequested?}` → `{plan}` — client can mark a meal eaten or flag it for a swap; cannot change what the meal is |
| DELETE | `/plans/:id` | dietitian, admin | → `204` |

Each meal slot: `{day, time, mealType, recipe, completed, swapRequested}`.

## Recipes — `recipe.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/recipes` | dietitian, admin | `?mealType=&search=` → `[recipe]` |
| GET | `/recipes/:id` | dietitian, admin | → `{recipe}` |
| POST | `/recipes` | dietitian, admin | `{title, emoji?, mealType, prepTime, tags?, kcal?, protein?, ingredients, instructions}` → `{recipe}` |
| PATCH | `/recipes/:id` | dietitian, admin | partial fields → `{recipe}` |
| DELETE | `/recipes/:id` | dietitian, admin | → `204` |

## Calls — `call.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/calls` | Auth (own) | `?client=&from=&to=` (`client` further narrows a dietitian/admin's own results) → `[call]` (`dietitian`/`client` populated to `{_id, name}`) |
| POST | `/calls` | client, dietitian, admin | client: `{scheduledAt, notes?}` (server derives `client`/`dietitian` from the caller's `assignedDietitian`, `400` if none set); dietitian: `{client, scheduledAt, notes?}` (server sets `dietitian` to self); admin: `{client, dietitian, scheduledAt, notes?}` → `{call}` |
| PATCH | `/calls/:id` | dietitian(own), admin, client(own) | client may only send `{scheduledAt?}` (reschedule) or `{status: 'cancelled'}` (cancel) on a still-`scheduled` call — `403`/`400` otherwise; dietitian/admin → `{scheduledAt?, status?, notes?}` → `{call}` |
| DELETE | `/calls/:id` | dietitian, admin | → `204` |

## Progress — `progress.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/progress` | Auth (own) | `?client=` (dietitian: only their assigned client, `403` otherwise; admin: any) → `[progress]` |
| POST | `/progress` | client | `{date, weight, energy?, adherence?}` → `{progress}` |
| PATCH | `/progress/:id` | client(own), admin | → `{progress}` |
| DELETE | `/progress/:id` | client(own), admin | → `204` |

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
