# Phase 1 — Multi-Tenant Foundation: Organisations, org_id, HR Invite

Working copy only: `/home/hatch/workspace/phase1-multitenant`
(based on pushed `main`, commit `f51c639`, JWT login/signup already in place).
**Not pushed, not committed, not deployed.** No secret values anywhere, no
`.env` file in the tree.

## What changed

### New backend models

- `backend/app/models/organization.py` — `Organization` table: `id`, `name`,
  `timezone` (default `Asia/Karachi`), `work_start` (`10:00`), `work_end`
  (`19:00`), `grace_minutes` (15), `pinecone_namespace` (unique), timestamps.
  `generate_pinecone_namespace()` returns `org-` + 12 random hex chars from
  `uuid4`, server-side only, never from client input.
- `backend/app/models/invitation.py` — `Invitation` table: `org_id`, `email`,
  `role` (`hr`/`admin` only, `InviteRole` enum), `token_hash` (SHA-256, unique),
  `expires_at`, `used_at`, `created_by`, `created_at`. The raw token is never
  stored.
- `backend/app/models/user.py` — new `UserRole.admin`; `User.org_id` FK to
  organizations (nullable) + `organization` relationship.
- `backend/app/models/employee.py` — `Employee.org_id`, `Department.org_id`
  (nullable FKs).
- `backend/app/models/attendance.py` — `AttendanceRecord.org_id` (nullable FK).
- `backend/app/models/policy_upload.py` — `PolicyUpload.org_id` (nullable FK).
- `backend/app/models/__init__.py` — exports `Organization`,
  `generate_pinecone_namespace`, `Invitation`, `InviteRole`.

### Auth schemas (`backend/app/schemas/auth.py`)

- `SignupRequest`: `role` removed entirely; `department` removed (it only
  existed to create new employee records). Public signup is employee-only.
- `CompanySignupRequest` (new): `company_name`, `admin_name`, `email`,
  `password`, optional `timezone` / `work_start` / `work_end` /
  `grace_minutes`.
- `InvitationCreateRequest`, `InvitationAcceptRequest`,
  `InvitationResponse` (never includes a token hash),
  `InvitationCreatedResponse` (invitation + raw token, shown once).
- `AuthUserResponse`: added `org_id` and `organization_name`.

### Auth service (`backend/app/services/auth_service.py`)

- `signup_user`: employee-only. Links to an **existing** employee by
  `employee_id` first, then by email. 400 "Employee record not found. Ask HR
  to add you first." when no record matches. New user role is always
  `employee`; `org_id` is copied from the linked employee.
- `company_signup`: creates the `Organization` (server-generated Pinecone
  namespace) + first Admin user (no employee link), returns `AuthData`.
  Email verification is **not** in Phase 1.
- `create_invitation`: creator must be HR or Admin of an org; role must be
  `hr` or `admin`; token = `secrets.token_urlsafe(32)`, only the SHA-256 hash
  is stored; expires in 24 hours; 409 if an active invite already exists
  for the same email in the org; returns the raw token once.
- `accept_invitation`: hashes the token, finds an unused, unexpired invite;
  unknown/expired/used token = generic 401; creates the user with the
  invite's role and org, marks the invite used, returns `AuthData`.
- `list_invitations`: HR/Admin only, own org only, newest first, no token
  hashes.
- `authenticate_user`, `refresh_tokens`, `revoke_refresh_token`,
  `get_user_profile` unchanged. Profile now includes `org_id` and
  organization name.

### Auth dependencies (`backend/app/core/auth_deps.py`)

- `require_hr_role` now accepts **hr or admin** (admin is a superset). All
  existing HR-only routes (dashboard, employees, policy, late-intelligence)
  now also allow Admin.
- New `require_admin_role` (admin only) and `require_hr_or_admin`.
- `require_self_or_hr` / `require_self_not_hr` treat admin like HR.

### Auth router (`backend/app/routers/auth.py`)

All endpoints use the existing JSON envelope + logger + try/except style.

| Endpoint | Auth | Result |
| --- | --- | --- |
| `POST /auth/company-signup` | public | 201, org + admin + tokens |
| `POST /auth/signup` | public | 201, employee-only (see behaviour change) |
| `POST /auth/invitations` | HR/Admin | 201, invitation + raw token (once) |
| `GET /auth/invitations` | HR/Admin | 200, own org's invitations |
| `POST /auth/invitations/accept` | public (token in body) | 201, new HR/Admin user + tokens |

### Seed (`backend/app/seed_auth.py`)

Seeded HR is assigned to the first organization, or to a new
"Default Organization" (Asia/Karachi, 10:00–19:00, grace 15, generated
namespace) when none exists. Company signup is the normal admin path.

### Alembic migration

- `backend/alembic/versions/c9d8e7f6a5b4_phase1_organizations.py`
  (down_revision `b7c2d4e5f6a7`).
- Creates `organizations` + `invitations` tables; adds nullable `org_id` to
  `users`, `employees`, `departments`, `attendance_records`,
  `policy_uploads`; adds `'admin'` to the Postgres `userrole` enum
  (autocommit block, Postgres only); data migration creates one
  "Default Organization" and assigns all existing NULL-`org_id` rows to it.
- Two guards found while testing: the initial migration (`8410df4f6239`)
  is a no-op — base tables are created by `create_all` at app startup —
  so `org_id` columns are only added to tables that already exist; and
  SQLite cannot add FK constraints via ALTER TABLE, so SQLite gets
  columns + indexes only while Postgres gets the FKs too.
- `backend/alembic/env.py` now imports `Organization` and `Invitation`.

### Frontend (same purple theme, no new deps)

- `frontend/app/signup/page.tsx` — role selector and HR option removed;
  department field removed; employee ID required; note: "Employee only.
  HR accounts are by invite only."
- `frontend/app/company-signup/page.tsx` (new) — company + admin
  name/email/password, optional timezone/work hours/grace; redirects admin
  to `/hr`.
- `frontend/app/hr/invitations/page.tsx` (new) — HR/Admin only; form
  email + role (hr/admin); shows the invite link to copy (token shown
  once); lists the org's invitations with Pending/Used status.
- `frontend/app/invitations/accept/page.tsx` (new) — accepts `?token=`,
  name + password, joins the company. (Needed so the copied invite link
  goes somewhere.)
- `frontend/lib/api.ts` — new `companySignup`, `createInvitation`,
  `listInvitations`, `acceptInvitation`.
- `frontend/lib/types.ts` — `UserRole` now `"employee" | "hr" | "admin"`;
  `AuthUser` gains `org_id` / `organization_name`; `SignupPayload` loses
  `role`/`department`; new `CompanySignupPayload`, `Invitation`,
  `InvitationCreated`, `InviteRole` types.
- `frontend/lib/session.tsx` — new `companySignup` and `acceptInvitation`
  session methods (sign the new user in immediately).
- `frontend/app/login/page.tsx` — admin redirects to `/hr`.
- `frontend/app/hr/layout.tsx` — HR layout guard allows `hr` or `admin`.
  Admin uses the HR dashboard in Phase 1.

## Deliberate behaviour changes

1. **Public signup no longer creates employee records.** If no existing
   employee matches the employee ID or email, signup fails with 400 and HR
   must add the employee first. Previously it created a new employee record
   (with a generated EMP code) when a department was supplied.
2. **Public signup can no longer create HR accounts.** The `role` field is
   gone from the payload; a `role` key sent in the body is ignored by
   Pydantic and the account is always `employee`. HR/Admin accounts come
   only from company signup (first admin) or an invitation.
3. **Admin is a superset of HR** in `require_hr_role` and the self-access
   helpers, so Admin can open every HR route and the HR dashboard.
4. **Invitation tokens are shown once.** Email sending is not built yet —
   the inviter copies the link and shares it manually. Tokens expire after
   24 hours and are single-use.

## Environment variables

No new variables. Existing ones still apply: `JWT_SECRET_KEY` (required,
generate with `openssl rand -hex 32`), `JWT_ALGORITHM=HS256`,
`ACCESS_TOKEN_EXPIRE_MINUTES=15`, `REFRESH_TOKEN_EXPIRE_DAYS=7`,
`DATABASE_URL`, and the seed vars `AWI_SEED_HR_EMAIL` /
`AWI_SEED_HR_PASSWORD` / `AWI_SEED_HR_NAME`.

## How to test locally

```bash
# from the working-copy root, with your own .env (never commit it)
uv run --directory backend alembic upgrade head
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd frontend && npm install && npm run dev
```

1. Open `http://localhost:3000/company-signup`, register a company — you
   land on `/hr` as admin.
2. In `/hr/invitations`, invite `hr@example.com` as HR, copy the link, open
   it in a private window, set a name/password — the new HR account lands
   on `/hr`.
3. Reusing the same invite link fails with 401.
4. Open `/signup` and sign up with an existing employee's ID/email — you
   land on `/employee`. Signing up with an unknown employee ID fails with
   400. Sending `role: "hr"` in the signup body is ignored.

## Verification results (all run in this task)

- `python3 -m compileall backend main.py` — **passed** (exit 0).
- Frontend `npx tsc --noEmit` in a scratch copy under
  `~/workspace/.tmp-phase1-tsc` (deleted after) — **passed, exit 0, no
  errors** (npm install added 98 packages in the scratch copy only).
- SQLite smoke test (minimal FastAPI app mounting only the auth router,
  throwaway DB and throwaway JWT secret, both deleted after) —
  **24/24 checks passed**: company signup 201 + admin role + org set +
  namespace `org-` + 12 hex chars; employee signup 201 with `role=hr` in
  the body ignored; employee signup links `org_id` from the employee;
  signup with no employee record 400; duplicate email 409; HR login 200;
  create invitation 201 with raw token and no `token_hash` in the
  response; employee creating an invitation 403; accept invitation 201
  with role hr in the same org; invite reuse 401; expired invite 401;
  list invitations 200 with 2 items and no token hashes.
  - One test-only fix during the run: the first attempt used `.test`
    email domains, which `email-validator` rejects as reserved names.
    Switching the test addresses to `.com` fixed it; no code change.
- Alembic migration on SQLite (bonus check, not in the original list):
  `upgrade head` → `downgrade b7c2d4e5f6a7` → `upgrade head` — **passed**;
  final version `c9d8e7f6a5b4`, "Default Organization" created with an
  `org-` namespace, `users.org_id` present. This run caught two real
  bugs, both fixed (missing-table guard; SQLite FK guard — see migration
  section). Postgres-specific parts (enum `ADD VALUE`, FK creation) could
  not be tested here — no Postgres was available — so run `alembic upgrade
  head` against Postgres before relying on it.
- Secret check: `grep -rn "sk-"` over backend/frontend/main.py/pyproject.toml
  — **0 lines**; no `.env` file in the tree.
- All throwaway artifacts deleted: tsc scratch copy, smoke-test venv,
  test databases, smoke-test script, and the log file the smoke test's
  logger import created in the tree.

## NOT DONE — Phase 1 does not yet isolate tenants

- **Dashboard, attendance, employee, and policy queries are NOT scoped by
  `org_id` yet.** The columns exist, but every existing route still reads
  all rows. A user from Company A can still see Company B's dashboard and
  attendance. That is Phase 2 work.
- **Pinecone still uses the single global namespace** `company-policy`
  from settings. Per-company namespaces are only *reserved* (the name is
  generated and stored on the organization row at company signup); no
  Pinecone call uses them yet. That is Phase 3 work.
- No email verification, no email sending for invites (token/link is
  copied manually), no Manager role, no audit log, no rate limiting, no
  SSO, no MFA.
- The old shared Pinecone policy has **not** been moved into any org's
  namespace.
- No "Invitations" link was added to the HR sidebar navigation; the page
  lives at `/hr/invitations`.
- The Postgres enum change and Postgres FK creation in the migration were
  not executed against a real Postgres database in this task.
