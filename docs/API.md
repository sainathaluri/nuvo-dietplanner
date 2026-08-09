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
| GET | `/users` | admin, dietitian | `?role=&assignedDietitian=` → `[user]` |
| GET | `/users/:id` | admin, dietitian(own), self | → `{user}` |
| PATCH | `/users/me` | Auth | `{name?, phone?}` → `{user}` |
| PATCH | `/users/:id` | admin | `{role?, assignedDietitian?, ...}` → `{user}` |
| POST | `/users` | admin | `{name, email, password, role}` → `{user}` |

## Enquiries — `enquiry.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/enquiries` | Public | `{goal, name, email, phone, preferredSlot?, note?}` → `{enquiry}` |
| GET | `/enquiries` | admin | `?status=` → `[enquiry]` |
| GET | `/enquiries/:id` | admin | → `{enquiry}` |
| PATCH | `/enquiries/:id` | admin | `{status?, note?}` → `{enquiry}` |
| DELETE | `/enquiries/:id` | admin | → `204` |

## Plans — `plan.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/plans` | Auth (own) | `?client=&week=` → `[plan]` |
| GET | `/plans/:id` | Auth (own) | → `{plan}` |
| POST | `/plans` | dietitian, admin | `{client, dietitian, week, meals[]}` → `{plan}` |
| PATCH | `/plans/:id` | dietitian, admin | `{meals?, published?}` → `{plan}` |
| DELETE | `/plans/:id` | dietitian, admin | → `204` |

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
| GET | `/calls` | Auth (own) | `?from=&to=` → `[call]` |
| POST | `/calls` | dietitian, admin | `{client, dietitian, scheduledAt, notes?}` → `{call}` |
| PATCH | `/calls/:id` | dietitian, admin, client(own, cancel only) | `{scheduledAt?, status?, notes?}` → `{call}` |
| DELETE | `/calls/:id` | dietitian, admin | → `204` |

## Progress — `progress.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/progress` | Auth (own) | `?client=` (dietitian/admin) → `[progress]` |
| POST | `/progress` | client | `{date, weight, energy?, adherence?}` → `{progress}` |
| PATCH | `/progress/:id` | client(own), admin | → `{progress}` |
| DELETE | `/progress/:id` | client(own), admin | → `204` |

## Reports — `report.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/reports` | Auth (own) | → `[report]` |
| POST | `/reports` | client | `multipart/form-data {file, note?}` → `{report}` (status `pending`) |
| PATCH | `/reports/:id` | dietitian, admin | `{review, status}` → `{report}` |
| DELETE | `/reports/:id` | client(own), admin | → `204` |

## Insights — `insights.routes.js`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/insights/admin-overview` | admin | `{newEnquiries, followUpsToday, conversionRate, activeClients, growthSeries[], dietitianWorkload[]}` |
| GET | `/insights/dietitian-overview` | dietitian | `{todaysAppointments[], attentionItems[], clientMomentum}` |

## Known gaps (flagged, not silently decided)

- `Report` file storage is local disk (`server/uploads/`) for now — swap for S3 when decided.
- `growthSeries` and `attentionItems` return empty placeholders until there's real time-series /
  flagging logic to back them.
