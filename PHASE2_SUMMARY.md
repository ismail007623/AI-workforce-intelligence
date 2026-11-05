# Phase 2 — Org Scoping: visible_user_ids, /me Endpoints

Working copy only: `/home/hatch/workspace/phase2-org-scoping`
(based on Phase 1 code, pushed `main` commit `b9ead474`).
**Not pushed, not committed, not deployed.** No secret values anywhere, no
`.env` file in the tree.

## What changed

### Central scoping helper — `backend/app/core/scoping.py` (new)

- `visible_user_ids(db, me)` returns a SQLAlchemy select of
  `Employee.id` (the integer primary key — `AttendanceRecord.employee_id`,
  `LateArrivalReason.employee_id` and `EmployeeReliabilityScore.employee_id`
  are all FKs to it, while `Employee.employee_id` is the human code
  `EMP003`). Scope always comes from the authenticated user loaded from
  the database, never from the client: HR/Admin see all employees with
  `Employee.org_id == me.org_id`; an employee sees only their own linked
  employee id (`me.employee_id`); a future Manager sees their own record
  plus employees whose `manager_id` is their linked employee id.
- `visible_employee_ids(db, me)` is the same function under the other
  name — one helper, used everywhere, no copy-pasted org filters in
  routers.
- `get_scoped_employee(session, me, employee_code)` loads one employee
  by code with scope enforced: 404 when the code does not exist at all
  (same answer for every caller), 403 when it exists in another
  organization or when an employee asks for someone else's record.

### Model — `backend/app/models/employee.py`

- `Employee.manager_id` (nullable, self-FK to `employees.id`) so the
  manager branch of the helper has something real to filter on. No
  Manager role and no manager endpoints are added in Phase 2.

### Auth dependencies — `backend/app/core/auth_deps.py`

- `require_self_or_hr` is now org-aware via `get_scoped_employee`:
  HR/Admin may access records only in their own org (cross-org is 403,
  never 404); employees only their own record.
- New `require_own_employee(session, current_user)` resolves the linked
  employee from the token for the `/me` endpoints. HR/Admin get 403
  (they have no employee record to act on).

### Services — every query now takes the caller and scopes itself

- `stats_service.py`: `_all_employees(session, me)` filters by
  `visible_user_ids`; org-wide record queries add
  `AttendanceRecord.employee_id.in_(visible_user_ids(...))` **and**
  `AttendanceRecord.org_id == me.org_id` (new `_visible_records_query`
  helper). Department stats list only departments with
  `Department.org_id == me.org_id`. `get_employee_summary` /
  `get_employee_late_stats` resolve the employee through
  `get_scoped_employee` first. Late-reason analytics, high-risk
  employees and pattern alerts join `Employee` and filter by visible
  ids. Trend counts only visible employees.
- `attendance_service.py`: `list_today_records(session, me, ...)`
  scoped; `get_employee_history(session, me, code)` scoped;
  new check-in records are stamped `org_id=employee.org_id`
  (existing records get it stamped too).
- `employee_service.py`: `list_employees(session, me)` scoped;
  `create_employee(session, me, payload)` sets `org_id` from the
  creator's token (never from the body) and looks the department up
  inside the creator's org only.
- `department_employee_service.py`: department looked up by
  name **and** `org_id` (a same-named department in another org is
  404, not leaked); employees filtered by visible ids; reliability
  map scoped.
- `late_reason_service.py`: `get_late_intelligence_today(session, me)`
  scoped by visible ids + record `org_id`; reliability map scoped.
- `reliability_service.py`: `get_reliability_map(session, me=None)`
  filters by visible ids when a caller is passed.
- `policy_upload_service.py` / `policy_ingestion_service.py`:
  `mark_active_as_replaced`, `create_upload_record`,
  `get_active_upload`, `list_upload_history` all take `org_id`;
  uploads are stamped with the uploader's org and only that org's
  active policy is replaced.
- `insights_agent.py`: `run_insights_query(session, question, me)`
  and `_build_tools(session, me)` pass the caller into every stats
  tool, so the LLM only ever receives the caller's org's rows and
  cannot ask for an out-of-scope employee (that tool returns an
  error for such codes).
- `policy_assistant_service.py`: `get_last_n_messages` accepts an
  optional `employee_id` and filters chat history by it.

### Routers

- `dashboard.py`: every handler injects the current user and passes
  it to the services (summary, departments, department employees,
  trend, absentees).
- `attendance.py`: new `/me` endpoints (below); legacy routes pass
  the caller into the services; late-intelligence, today and
  today/absent are scoped.
- `employees.py`: list/create pass the caller; insights query passes
  the caller into `run_insights_query`.
- `policy.py`: status/history/download/upload pass
  `current_user.org_id` into the ingestion service.
- `policy_assistant.py`: the HR bypass is removed — HR/Admin are
  now org-checked by `require_self_or_hr` too — and chat history is
  fetched scoped to the employee code.

### /me endpoints — new, no employee_id anywhere

| Endpoint | Who | Behaviour |
| --- | --- | --- |
| `POST /attendance/me/check-in` | employee only | Resolves the employee from the token, runs the same check-in pipeline as the legacy route. HR/Admin get 403. |
| `POST /attendance/me/check-out` | employee only | Same as above for check-out. |
| `POST /attendance/me/late-reason` | employee only | Body is `{reason}` only (`MeLateReasonRequest`). |
| `GET /attendance/me/history` | employee only | Own history only. |
| `GET /attendance/me/summary` | employee only | Own summary only. |

### Legacy ID routes — kept, hardened

`/attendance/check-in`, `/check-out`, `/late-reason`,
`/attendance/employee/{id}`, `/attendance/employee/{id}/summary`
still work, but HR/Admin access is now limited to their own org and
cross-org access returns **403** (never a 404 that would leak whether
an employee code exists in another org). A code that does not exist
at all still returns 404, the same for every caller.

### Frontend (same purple theme, no new deps)

- `frontend/lib/api.ts`: `checkIn()`, `checkOut()`,
  `submitLateReason(reason)`, `getEmployeeHistory()`,
  `getEmployeeSummary()` now call the `/me` endpoints with no
  employee id. The old ID-based functions are gone — no employee
  page used them for anything else, so nothing dead remains.
- `frontend/components/employee/HeroCheckInCard.tsx` and
  `LateReasonModal.tsx` (the `employeeId` prop is removed) and
  `frontend/app/employee/page.tsx`,
  `frontend/app/employee/summary/page.tsx`,
  `frontend/app/employee/history/page.tsx` call the new
  no-argument functions. Employee ids remain only as React Query
  cache keys, never as API parameters.

### Alembic migration

- `backend/alembic/versions/d8e9f0a1b2c3_phase2_manager_id.py`
  (down_revision `c9d8e7f6a5b4`): adds nullable
  `employees.manager_id` with an index; Postgres gets the
  self-referencing FK, SQLite gets the column + index only (same
  guard pattern as the Phase 1 migration). Downgrade drops it.

## Deliberate behaviour changes

1. **Dashboard/attendance/employee/policy data is now org-scoped.**
   An HR user sees only their own company's employees, departments,
   attendance, late list and absentees.
2. **Employee creation takes the org from the token.** A client-sent
   org id in the body would be ignored (the schema has no org field).
3. **The `/me` endpoints are the new default for employees.** The
   old ID routes still work but are org-checked.
4. **Cross-org access is 403, not 404.** A missing employee code is
   still 404 for everyone.
5. **A same-named department in another org is invisible** (404 on
   the department page) instead of leaking the other org's rows.

## Environment variables

No new variables. Existing ones still apply: `JWT_SECRET_KEY`,
`JWT_ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=15`,
`REFRESH_TOKEN_EXPIRE_DAYS=7`, `DATABASE_URL`.

## How to test locally with two companies

```bash
# from the working-copy root, with your own .env (never commit it)
uv run --directory backend alembic upgrade head
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd frontend && npm install && npm run dev
```

1. Register Company A at `/company-signup`, then Company B in a
   private window. Each lands on `/hr` as its own admin.
2. As Admin A, create employees in org A; as Admin B, create
   employees in org B. Each admin's `/hr` dashboard and
   `/employees` list show only their own company.
3. Sign up as an employee of Company A and open `/employee`:
   summary and history show only that employee.
4. As the Company A employee, try the old URL
   `/attendance/employee/EMP-B1` (a Company B code) — expect 403.
   As Admin B, open the same URL for a Company A employee — 403.
5. Check in from `/employee` (uses `/me/check-in` now), then check
   that Admin B's dashboard does not show that check-in.

## Verification results (all run in this task)

- `python3 -m compileall backend main.py` — **passed**.
- Frontend `npx tsc --noEmit` in a scratch copy under
  `~/workspace/.tmp-phase2-tsc` (deleted after) — **passed, exit 0,
  no errors**.
- SQLite smoke test (minimal FastAPI app mounting only the auth,
  attendance, dashboard and employees routers; throwaway DB and
  throwaway JWT secret, both deleted after; langgraph/langchain
  stubbed and the check-in pipeline replaced with a fake that
  echoes the record's own status) — **47/47 checks passed**,
  including: two company signups with different org ids; HR A
  dashboard total == 2 and HR B total == 2; each HR's `/employees`
  lists only their own org; HR A department list only org A and
  org B's department page 404s for HR A; `/me/summary` and
  `/me/history` show only self; `/me/check-in` 200 with the record
  stamped `org_id` of org A; second check-in 409; HR `/me/check-in`
  403; `/me/late-reason` 200 then 409 on resubmit; legacy history
  and summary of a cross-org employee 403 for both an employee and
  an HR of the other org, while same-org access is 200; unknown
  employee code 404; legacy check-in still works; HR A
  `/attendance/today` only org A and HR B's is empty; HR B
  `/today/absent` only org B; HR B late-intelligence contains no
  org A rows; trend last point present == 2 for org A only;
  policy active-upload/history scoped per org (service level);
  `visible_user_ids` helper level: HR sees only org ids, employee
  sees only self, manager branch (fake manager user) sees self +
  reports and not org B.
- Alembic migration on SQLite (Phase 1-era `employees` table
  without `manager_id`, stamped at `c9d8e7f6a5b4`):
  `upgrade head` → `downgrade c9d8e7f6a5b4` → `upgrade head` —
  **passed**; final version `d8e9f0a1b2c3`, `manager_id` column
  present after upgrade and absent after downgrade. Postgres FK
  creation was not executed against a real Postgres database.
- One real bug found by the smoke test and fixed: the new scoped
  employee loaders did not eager-load `department`, so reading
  `employee.department.name` failed under async SQLAlchemy
  (`MissingGreenlet`). Both loaders now use
  `selectinload(Employee.department)`.
- Secret check: `grep -rn "sk-"` over the whole tree — **1 line**,
  which is the literal string `sk-` inside `PHASE1_SUMMARY.md`
  describing the check itself, not a secret; no `.env` file in
  the tree.
- All throwaway artifacts deleted: tsc scratch copy, smoke-test
  venv, test databases, smoke-test script, and the log file the
  logger import created in the tree.

## NOT DONE — Phase 2 does not finish multi-tenant isolation

- **Pinecone still uses the single global namespace**
  `company-policy` from settings. Per-company namespaces are only
  *reserved* (the name is generated and stored on the organization
  row at company signup); no Pinecone call uses them yet. The
  policy chatbot can still answer from another company's policy
  document. That is Phase 3 work.
- **No Manager role exists yet.** The `visible_user_ids` manager
  branch and the `manager_id` column are ready, but no user can
  hold a manager role and no manager endpoints exist.
- No audit log, no rate limiting, no email verification, no SSO,
  no MFA. The old shared Pinecone policy has not been moved into
  any org's namespace.
- **Known limitation — `Department.name` is globally unique.**
  Two orgs cannot both create a department called "Engineering"
  yet; the second create fails on the unique constraint. Employee
  creation looks departments up inside the creator's org, so it
  never attaches an employee to another org's department, but a
  migration to a composite `(org_id, name)` uniqueness is needed
  before real multi-company onboarding.
- **Insights LLM execution was not run** (no OpenAI key in the
  smoke test). The tools the agent calls are the same scoped stats
  functions verified over HTTP, but `run_insights_query` end to
  end was not executed.
- Agent graph nodes (`checkin_graph`, `late_reason_graph`) resolve
  single records by id from pipeline state; they are only reached
  from scoped entry points, but they do not re-check org scope
  themselves.
- The Postgres self-FK on `employees.manager_id` was not executed
  against a real Postgres database in this task.
