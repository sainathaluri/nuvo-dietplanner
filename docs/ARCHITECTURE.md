# Architecture

## Overview

Nourishly is a monorepo with two independently run apps:

- **`client/`** — React 18 + Vite (JavaScript, no TS), Tailwind v4, shadcn/ui (radix base, Nova
  preset re-themed onto the legacy palette in `client/src/index.css`).
- **`server/`** — Node.js + Express (ESM), MongoDB + Mongoose.

## Auth flow

- Access token: short-lived JWT, returned in the response body on login/register/refresh, held
  only in memory on the client (`client/src/api/tokenStore.js`) — never in `localStorage`.
- Refresh token: long-lived JWT in an `httpOnly`, `sameSite=strict` cookie scoped to `/api/auth`,
  set by the server, read by `POST /api/auth/refresh`.
- `client/src/context/AuthContext.jsx` silently calls `/auth/refresh` → `/auth/me` on mount to
  restore a session; `client/src/api/axiosClient.js`'s response interceptor retries a single
  401 by refreshing, then replays the original request.
- `server/src/middleware/authenticate.js` verifies the access token and loads `req.user`;
  `authorize(...roles)` gates by role; per-resource ownership checks live in each controller.

## Request flow (server)

`routes/*.routes.js` → `middleware/validate.js` (zod) → `middleware/authenticate.js` /
`authorize.js` → `controllers/*.controller.js` (wrapped in `middleware/asyncHandler.js`) →
`models/*.js` (Mongoose) → `middleware/errorHandler.js` formats any thrown `utils/ApiError.js`.

## Client data flow

`components/` never call the API directly. `hooks/` (React Query) call `api/*.api.js`, which call
the shared `axiosClient`. Screens built before their endpoint exists use `mocks/` fixtures with a
`TODO(api):` comment (CLAUDE.md rule 5), never inline fake arrays.

## Folder structure

See `CLAUDE.md` §1 and the approved plan for the full `client/`/`server/` layout.

## Not yet implemented

The marketing site, the three-role portal UI, and file-storage backend beyond local disk are
follow-up phases — see `docs/PROGRESS.md`.
