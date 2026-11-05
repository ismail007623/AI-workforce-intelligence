# Authentication (JWT)

Email + password login with short-lived access tokens (15 minutes by
default) and rotating refresh tokens (7 days by default). HR accounts
have no employee record; employee accounts link to exactly one
employee record and may only access their own data.

## Required environment variables

Set these in the local `.env` file only. Never commit `.env`.

```text
JWT_SECRET_KEY=            # required; generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

When `JWT_SECRET_KEY` is empty, token creation and verification fail
fast with a clear error instead of using an insecure default.

## Endpoints (all under `/api/v1/auth`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/signup` | None | 201. Body: `SignupRequest`. Employee signups link to an existing employee by `employee_id` or email, otherwise create one (department required). |
| POST | `/login` | None | 200. Body: `LoginRequest`. Wrong credentials return a generic 401. |
| POST | `/refresh` | None (refresh token in body) | 200. Body: `RefreshRequest`. Rotates: the old refresh token is revoked. |
| POST | `/logout` | Bearer access token | 200. Body (optional): `RefreshRequest` to revoke that refresh token. |
| GET | `/me` | Bearer access token | 200. Returns the caller's profile. |

All auth responses use the envelope
`{"data": ..., "message": ..., "status": "success" | "error"}`.

Example signup payload (no real credentials):

```json
{
  "name": "Usman Ali",
  "email": "usman@example.com",
  "password": "at-least-8-characters",
  "role": "employee",
  "department": "Engineering",
  "employee_id": "EMP003"
}
```

## Protected routes

- HR only: dashboard summary/departments/trend/absentees, employee
  list/create, insights query, policy upload/status/history/download,
  late-intelligence, today and today/absent lists.
- Self only (HR blocked): check-in, check-out, late-reason submission.
- Self or HR: employee history/summary, policy chat.

## Seed HR account (optional)

```bash
AWI_SEED_HR_EMAIL=hr@example.com \
AWI_SEED_HR_PASSWORD='choose-a-strong-password' \
AWI_SEED_HR_NAME='HR Admin' \
python -m backend.app.seed_auth
```

The script creates the account only when all three variables are set
and no account with that email exists. The password is never logged.

## Production follow-ups (not done in this POC change)

- Store tokens in httpOnly, Secure, SameSite cookies instead of
  `localStorage` (see the comment in `frontend/lib/api.ts`).
- Rate-limit `/login` and `/signup`, add email verification and
  password-reset flows, and restrict HR signup before real clients.
- Run the Alembic migration (`b7c2d4e5f6a7`) instead of relying on
  `create_all` in production.
