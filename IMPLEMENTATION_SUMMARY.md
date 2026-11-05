# Implementation Summary — JWT Login/Signup (uncommitted working tree)

Base: HEAD `9f05004` (3 commits), GitHub
`https://github.com/ismail007623/AI-workforce-intelligence`.
Nothing was pushed, committed, or published. No real secret, key,
password, or token appears in any file below.

## What was implemented

JWT access tokens (15 min default) + rotating refresh tokens (7 days
default), bcrypt password hashing, and role/ownership checks on every
existing router, following the user's Xeven endpoint/helper format
(`dependencies=[Depends(JWTBearer())]`, `try:` body, `JSONResponse`
envelope `{"data", "message", "status"}`, `logger.error(...)`, Google
docstrings on helpers/services, PEP8). The `X-AWI-Role` / `X-AWI-User`
header trust and the profile-picker are removed.

### Backend — added

- `backend/app/core/security.py` — `hash_password`, `verify_password`,
  `create_access_token`, `create_refresh_token`, `decode_token`
  (type-claim checked, unique `jti` per token so two tokens issued in the
  same second are never identical), `hash_refresh_token` (SHA-256; only hashes stored).
- `backend/app/models/user.py` — `UserRole` (`employee`, `hr`), `User`
  (email unique, `hashed_password`, role, `employee_id` FK unique,
  `is_active`), `RefreshToken` (hash unique, expiry, revoked).
- `backend/app/schemas/auth.py` — `SignupRequest`, `LoginRequest`,
  `RefreshRequest`, `TokenPair`, `AuthUserResponse`, `AuthData`. No
  password in any response schema.
- `backend/app/services/auth_service.py` — `signup_user`,
  `authenticate_user`, `refresh_tokens` (rotate + revoke old),
  `revoke_refresh_token`, `get_user_profile`. Signup links to an
  existing employee by `employee_id` or email (409 if that employee
  already has an account), otherwise creates the employee (department
  required) and auto-generates the next `EMP###` code. Login failures
  use one generic 401 message.
- `backend/app/core/auth_deps.py` — `JWTBearer`, `get_current_user`,
  `require_hr_role`, `require_self_or_hr`, `require_self_not_hr`.
- `backend/app/routers/auth.py` — `POST /auth/signup` (201),
  `POST /auth/login`, `POST /auth/refresh` (rotates), `POST /auth/logout`
  (JWTBearer + optional refresh body), `GET /auth/me`.
- `backend/alembic/versions/b7c2d4e5f6a7_auth_users.py` — creates
  `users` + `refresh_tokens` (down_revision `8410df4f6239`), with
  downgrade.
- `backend/app/seed_auth.py` — creates one HR user only from env vars
  `AWI_SEED_HR_EMAIL` / `AWI_SEED_HR_PASSWORD` / `AWI_SEED_HR_NAME`.
  Never logs the password.
- `README_AUTH.md` — env vars, endpoints, protected-route list, seed
  usage, production follow-ups.

### Backend — changed

- `backend/app/core/config.py` — added `jwt_secret_key: str = ""`
  (no default; auth fails fast when empty), `jwt_algorithm`,
  `access_token_expire_minutes`, `refresh_token_expire_days`.
- `pyproject.toml` — added `PyJWT>=2.10.0`, `bcrypt>=4.1.0`.
- `.env.example` — JWT + seed placeholders (empty), with a comment to
  generate a secret via `openssl rand -hex 32`. No `.env` was created.
- `backend/app/core/deps.py` — now only re-exports from `auth_deps.py`;
  header trust removed.
- `backend/app/models/__init__.py`, `main.py` — export/import `User` /
  `RefreshToken`; auth router mounted at `/api/v1`.
- `backend/alembic/env.py` — imports `User` / `RefreshToken`.
- Routers protected (existing response shapes kept, no envelope
  conversion): `attendance.py` (check-in/out + late-reason self-only,
  HR blocked; late-intelligence/today/absent HR only; history/summary
  self-or-HR), `dashboard.py` (all HR only), `employees.py` (all HR
  only, incl. insights), `policy.py` (HR only; `uploaded_by` now from
  the token user), `policy_assistant.py` (authenticated, employee
  self-only, HR allowed; auth failures keep the envelope shape with
  401/403, unexpected errors are 500, not 404).

### Frontend — added / changed (same purple theme, no new deps)

- `frontend/lib/types.ts` — `AuthUser`, `TokenPair`, `AuthData`,
  `LoginPayload`, `SignupPayload`, `RefreshPayload`, `AuthEnvelope<T>`.
- `frontend/lib/api.ts` — removed `getHrHeaders` and all `X-AWI`
  headers. Bearer token on every request; on 401 (non-auth calls) one
  refresh attempt then one retry; upload/download also send the token
  (download refreshes once). Exports `signup`, `login`,
  `refreshTokens`, `logout`, `getMe`, token helpers. Tokens in
  `localStorage` (`awi.access_token` / `awi.refresh_token`) — POC
  choice, documented in code; httpOnly cookies are the production
  follow-up.
- `frontend/lib/session.tsx` — rewritten to JWT session: hydrates via
  `/me` (refresh handled by `api`), `login`/`signup`/`logout`/
  `clearSession`, legacy `awi.role`/`awi.employee` keys removed on
  load. `setEmployeeSession`/`setHrSession` removed.
- `frontend/app/login/page.tsx`, `frontend/app/signup/page.tsx` — new
  pages: centred card, accessible labels, show/hide password, error
  box, loading state. Signup has a role selector; department +
  employee ID only for Employee; HR note shown. Both carry the POC
  note: HR signup is open — restrict it before real clients.
- `frontend/components/landing/RoleEntry.tsx` — profile-picker modal
  and `getEmployees` call removed; two cards link to `/login`, plus a
  link to `/signup`. Visual style unchanged.
- `frontend/app/page.tsx` — CTA text now says "Sign in to explore…".
- `frontend/app/employee/layout.tsx`, `frontend/app/hr/layout.tsx` —
  guards now require a JWT session and redirect to `/login`; HR layout
  shows the signed-in user's name/email.
- `frontend/components/layout/AppShell.tsx` — logout calls `logout()`
  then routes to `/login`.

## Example payloads (no real credentials)

Signup:

```json
{"name": "Usman Ali", "email": "usman@example.com", "password": "at-least-8-characters", "role": "employee", "department": "Engineering", "employee_id": "EMP003"}
```

Login: `{"email": "usman@example.com", "password": "at-least-8-characters"}`
Refresh: `{"refresh_token": "<refresh token from login>"}`

## Environment variables required

`DATABASE_URL`, `JWT_SECRET_KEY` (required, empty by default),
`JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`,
`REFRESH_TOKEN_EXPIRE_DAYS`. Seed only:
`AWI_SEED_HR_EMAIL`, `AWI_SEED_HR_PASSWORD`, `AWI_SEED_HR_NAME`.

## Verification (see report for exact results)

- `python3 -m compileall backend main.py` — pass.
- Frontend `npx tsc --noEmit` — pass (run in a scratch copy; see report).
- Smoke test against SQLite + httpx — see report; it covers signup,
  login, wrong-password 401, no-token 401, employee→HR-route 403,
  refresh rotation (old refresh rejected), and logout revocation.
- Secret check: searching the tree for key-like prefixes returns 0 lines; no
  `.env` file exists in the tree.

## NOT done (production follow-ups)

httpOnly Secure SameSite cookies instead of `localStorage`; rate
limiting on login/signup; email verification and password reset;
restricting HR signup; per-company (tenant) separation; running the
Alembic migration in production instead of `create_all`. The
`X-AWI-Role` string remains only in two docstrings explaining its
removal.
