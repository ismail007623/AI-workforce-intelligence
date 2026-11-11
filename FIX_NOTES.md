# Migration fix — `alembic upgrade head` fails with `type "userrole" already exists`

Prepared 2026-11-07 (after Ismail's 14:33 PKT error post). Nothing pushed,
nothing changed in his repo. Files in this folder replace the same-named
files in `backend/alembic/versions/`.

## What happened, in simple words

The app itself creates the database tables when the backend starts
(`main.py` lifespan runs `Base.metadata.create_all`). The first migration
file is empty and does nothing. So by the time Ismail ran
`alembic upgrade head`, his Postgres already had the `userrole` type and
the `users` / `refresh_tokens` tables — and the login migration tried to
create them again. Postgres stopped with:

`asyncpg.exceptions.DuplicateObjectError: type "userrole" already exists`

The exact trigger: the old migration called `_USER_ROLE.create(checkfirst=True)`
and then `op.create_table("users", ... role=_USER_ROLE ...)`. The explicit
create was skipped, but `create_table` itself re-issued
`CREATE TYPE userrole AS ENUM ('employee', 'hr')` — SQLAlchemy's Enum
`_on_table_create` runs without `checkfirst`. So `checkfirst=True` did
not protect it.

## The deeper problem — the stamp fix alone is not enough

The assistant's 14:34 PKT reply told Ismail to stamp the login migration
and then run `upgrade head`, expecting Phases 1–3 to run cleanly. That
expectation is probably wrong. The same trap is in the later migrations,
because `create_all` also builds everything the Phase 1–3 models describe:

- **Phase 1 (`c9d8e7f6a5b4`)**: same enum trap for `inviterole`, plus
  unguarded `create_table("organizations")` / `create_table("invitations")`
  and unguarded `add_column(org_id)` / index / FK steps. If the backend
  ever started with the Phase 1 code, all of those already exist.
- **Phase 2 (`d8e9f0a1b2c3`)**: unguarded `add_column(employees.manager_id)`
  + index + FK. The Employee model already has `manager_id`, so
  `create_all` already built it.
- **Phase 3 (`f3c4d5e6a7b8`)**: unguarded `add_column(organizations.pinecone_migrated)`
  and unguarded `create_unique_constraint("uq_department_org_name")`.
  Both already exist in the models, so `create_all` already built them.

Whether Phase 1–3 hit this depends on one fact Ismail has not sent yet:
his `check_db.py` output. If its TABLES list includes `organizations`
and `invitations`, the backend did start with the new code and the stamp
path will fail again at Phase 1. If it does not, the stamp path may work.
The fixed files below work in both cases, so no stamp is needed at all.

## What changed in each file

- `b7c2d4e5f6a7_auth_users.py` — enum uses `create_type=False`; on
  Postgres the type is created only inside a `DO ... EXCEPTION WHEN
  duplicate_object THEN null` block; each table + its indexes are created
  only when the table does not exist. Enum values now include `admin`
  to match the current `UserRole` model.
- `c9d8e7f6a5b4_phase1_organizations.py` — same treatment for
  `inviterole`; `organizations` / `invitations` tables created only when
  missing; `org_id` column / index / FK added only when missing
  (checked by inspector). Downgrade guarded the same way.
- `d8e9f0a1b2c3_phase2_manager_id.py` — `manager_id` column / index /
  FK added only when missing; downgrade guarded.
- `f3c4d5e6a7b8_phase3_pinecone_namespaces.py` — `pinecone_migrated`
  added only when the column is missing; composite department unique
  created only when missing (SQLite rebuild skipped when the composite
  unique is already there); downgrade guarded.
- `8410df4f6239_initial_tables.py` — unchanged, included for completeness.

## How to apply (Ismail's decision needed — do not push without approval)

1. Copy the 4 changed files into `backend/alembic/versions/` (overwrite).
2. Run `uv run --directory backend alembic upgrade head` — no stamp step.
3. Expected: finishes with no error, `alembic current` shows `f3c4d5e6a7b8`.
4. Then start backend + frontend and begin TC1.

If Ismail already ran `alembic stamp b7c2d4e5f6a7` from the earlier reply:
that is fine — the fixed login migration simply will not re-run locally
(tables already exist), and the Phase 1–3 fixes still apply. Do not
re-stamp anything else.

## Verification done here (2026-11-07)

Ran real Alembic 1.20.1 + SQLAlchemy 2.1.8 against SQLite in /tmp/migtest
(minimal env.py, no app imports):

- Fresh empty DB + fixed files → `upgrade head` OK, version `f3c4d5e6a7b8`.
- DB pre-created the way `create_all` builds it (all 8 tables, org_id /
  manager_id / pinecone_migrated columns, composite department unique,
  model indexes) + fixed files → `upgrade head` OK, version `f3c4d5e6a7b8`.
- Same pre-created DB + the OLD files → fails at `b7c2d4e5f6a7`
  (table `users` already exists on SQLite; on his Postgres it was the
  `userrole` type) and stops at version `8410df4f6239`.
- Fresh DB + fixed files → `downgrade base` then `upgrade head` again → OK.

## Re-test 2026-11-10 — one more real bug found and fixed

Re-running the same two scenarios with the real app models
(`Base.metadata.create_all`, real `backend/alembic/env.py`) found a
bug the 7 Nov run had missed: on a database where `create_all` had
already run with the Phase 3 models, the Phase 1 data migration
failed with `NOT NULL constraint failed:
organizations.pinecone_migrated`, because its `bulk_insert` of the
"Default Organization" row did not include `pinecone_migrated`,
which is NOT NULL in the Phase 3 models. (The 7 Nov pre-built DB was
built from Phase 2-era models, so the column did not exist there
and the insert passed.)

Fixed in `c9d8e7f6a5b4_phase1_organizations.py`: the insert row now
includes `pinecone_migrated: False` whenever that column already
exists on the organizations table, and omits it otherwise. After
the fix, re-tested 2026-11-10:

- Fresh empty DB + fixed files → `upgrade head` OK, `f3c4d5e6a7b8`.
- Pre-built DB (`create_all` with current models, 2 orgs seeded,
  "Engineering" in both) + fixed files → `upgrade head` OK,
  `f3c4d5e6a7b8`; all 3 orgs (Alpha, Beta, Default) and both
  Engineering departments survive with the right org ids.
- Same pre-built DB + the OLD files → fails at `b7c2d4e5f6a7`,
  version stays `8410df4f6239` (control: the fix is what makes it pass).
- Downgrade on the seeded DB correctly refuses with the clear
  error "Cannot downgrade: these department names exist in more
  than one organization: Engineering" (the designed guard — it
  refuses instead of failing halfway).

## NOT verified — needs Ismail's own run

The Postgres-only branches were not run against live Postgres (no Postgres
server in this environment): the `DO ... EXCEPTION WHEN duplicate_object`
blocks for `userrole` / `inviterole`, `ALTER TYPE ... ADD VALUE IF NOT
EXISTS 'admin'`, Postgres FK creation, and the Postgres unique-constraint
path in Phase 3. They use standard Postgres idioms, but his
`alembic upgrade head` on his own Postgres is the real test. If it fails,
he should send the exact error, not skip the migration.
