# Phase 3 — Pinecone Per-Org Namespaces + Department Uniqueness

Working copy only: `/home/hatch/workspace/phase3-pinecone-namespaces`
(based on Phase 2 code, pushed `main` commit `7dc8dc76`).
**Not pushed, not committed, not deployed.** No secret values anywhere, no
`.env` file in the tree.

## What changed

### Pinecone service (`backend/app/services/pinecone_service.py`, rewritten)

- Same index `company-policy`, one namespace per org. Every
  function takes the namespace explicitly:
  `clear_namespace(namespace)`, `upsert_chunks(chunks, vectors,
  namespace, org_id)`, `get_namespace_vector_count(namespace)`,
  `query_namespace(vector, namespace, org_id, top_k)`,
  `delete_namespace(namespace)`, `copy_namespace(source,
  target, org_id)`, `list`/`fetch` via `_list_vector_ids`.
- `namespace_for_org(session, org_id)`: returns the org's stored
  namespace from its `Organization` row (loaded from the DB
  user via `org_id`); generates and saves one if an old row
  somehow has none. The namespace **never** comes from the
  client.
- Vector ids are `org-<org_id>-policy-<chunk_index>`; every
  vector carries `org_id` in its metadata. Every query adds a
  metadata filter `org_id == caller org` as a second check.
- `clear_namespace` no longer swallows errors: it logs and
  re-raises, so a failed clear cannot silently leave stale
  vectors.
- `settings.pinecone_namespace` is no longer used by any
  upload/query/count; it survives only as the *legacy*
  namespace name for the migration (`legacy_namespace()`),
  and is marked DEPRECATED in `config.py`.
- The Pinecone client is created defensively: if no API key is
  configured the import no longer crashes; `_get_index()`
  raises `ValueError("Pinecone is not configured.")` instead.

### Policy ingestion (`backend/app/services/policy_ingestion_service.py`)

- **Upload order fixed:** parse → chunk → embed → clear only
  the caller's org namespace → upsert → mark old policy
  replaced → create/complete the DB record. A failed parse or
  embedding leaves the old policy (vectors and DB record)
  untouched.
- `get_policy_status` reports the caller's own namespace and
  its vector count.
- New `migrate_policy_namespace(session, org_id)`: copies the
  legacy global namespace into the caller's org namespace
  (migrated ids are `org-<id>-migrated-<old id>`, so they can
  never overwrite vectors the org uploaded itself), verifies
  the copy by count (**before + copied**, because the org
  namespace may already hold its own vectors), deletes the
  legacy namespace only after a verified copy and only when
  something was copied, then sets `organizations.pinecone_migrated
  = True`. A second run raises `ValueError("...already run...")`.
  An empty legacy namespace succeeds with `copied_count 0`
  and `deleted_global False`.

### Policy assistant graph (`backend/app/agents/policy_assistant_graph.py`)

- `AgentState` gains `pinecone_namespace` and `org_id`,
  threaded from the router (token user only). The retrieve
  step calls `pinecone_service.query_namespace(...)` — no
  caller touches the raw index any more. An empty namespace
  returns no chunks and never falls back to another
  namespace; the existing "no policy document" reply is used.

### Routers

- `policy_assistant.py`: resolves the org namespace via
  `namespace_for_org(session, current_user.org_id)` and puts
  it in the graph state.
- `policy.py`: new admin-only endpoint `POST
  /api/v1/policy/migrate-namespaces` (`require_admin_role`;
  the router's HR dependency already allows Admin) returning
  `PolicyMigrationResponse` (`org_id`, `namespace`,
  `copied_count`, `deleted_global`). Second run → 409,
  other bad input → 400, unexpected failure → 500.
- `schemas/policy.py`: new `PolicyMigrationResponse`.

### Models

- `Organization.pinecone_migrated` (boolean, default False).
- `Department.name` is no longer globally unique; new
  `UniqueConstraint("org_id", "name", name="uq_department_org_name")`.
  Two orgs may both have "Engineering"; one org still cannot
  have the same department name twice. Employee creation
  already looked departments up by name + org (Phase 2) —
  verified still true.

### Alembic migration

- `backend/alembic/versions/f3c4d5e6a7b8_phase3_pinecone_namespaces.py`
  (down_revision `d8e9f0a1b2c3`): adds
  `organizations.pinecone_migrated`; replaces the global
  department-name uniqueness with the composite constraint.
  Postgres drops the old constraint (found by inspection) and
  creates the composite one. SQLite rebuilds the departments
  table with explicit DDL (copy → drop → rename) because the
  old `UNIQUE (name)` is unnamed in reflection and batch mode
  cannot drop it — verified: batch mode alone kept the global
  uniqueness alongside the composite one. The rebuild runs
  with foreign keys off, then re-enabled, and a
  `PRAGMA foreign_key_check` runs after it. Downgrade refuses
  with a clear error when two orgs share a department name
  (the global constraint cannot be restored then); otherwise
  it restores the old schema.

### Frontend

- No frontend changes. `tsc --noEmit` still run (passed) to
  prove nothing broke.

## Deliberate behaviour changes

1. **Policy data is now isolated per org in Pinecone.** Uploads,
   status, counts and the Policy Assistant all use the
   caller's org namespace + `org_id` metadata filter.
2. **Upload order:** parse/embed before clear. A failed
   upload no longer destroys the previous policy.
3. **Vector ids and metadata:** `org-<id>-policy-<n>` ids and
   `org_id` metadata on every vector, including migrated ones
   (`org-<id>-migrated-<old id>`).
4. **Global namespace deprecated:** `settings.pinecone_namespace`
   is only the migration source now; it will be removed once
   every org has migrated.
5. **Departments:** names are unique per org, not globally.
6. **Migration is explicit and one-time per org**, admin-only,
   and never runs at startup.

## Environment variables

No new variables. Existing ones still apply: `JWT_SECRET_KEY`,
`JWT_ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=15`,
`REFRESH_TOKEN_EXPIRE_DAYS=7`, `DATABASE_URL`, `PINECONE_API_KEY`.

## How to test locally with two companies

```bash
# from the working-copy root, with your own .env (never commit it)
uv run --directory backend alembic upgrade head
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
cd frontend && npm install && npm run dev
```

1. Register Company A and Company B at `/company-signup`.
   Each lands on `/hr` as its own admin.
2. As Admin A upload a policy PDF/DOCX; as Admin B upload a
   different one. Each org's `/hr/policy` status shows only
   its own chunk count and namespace.
3. Ask the Policy Assistant (as an employee of A) a question
   from A's policy: the answer comes from A's document. Ask
   about B's policy topic: the answer must say it has no such
   information — never B's content.
4. As Admin A, run the migration once (only needed for the
   old shared policy): `POST /api/v1/policy/migrate-namespaces`
   with the admin token. Expect `copied_count` > 0 on the
   first org and `deleted_global: true`; a second call for
   the same org returns 409. Other orgs migrating afterwards
   get `copied_count: 0` (the legacy namespace is already
   gone) and are flagged migrated.
5. Create a department called "Engineering" in both companies:
   both succeed now. Creating it twice in one company fails.

## Verification results (all run in this task)

- `python3 -m compileall backend main.py` — **passed**.
- Frontend `npx tsc --noEmit` in a scratch copy under
  `~/workspace/.tmp-phase3-tsc` (deleted after) — **passed,
  exit 0, no errors** (no frontend changes in Phase 3).
- Fake-Pinecone smoke test (in-memory fake index implementing
  upsert/query/delete/delete_all/describe_index_stats/list/fetch;
  real DOCX parsing and real chunking; fake deterministic
  embeddings; throwaway SQLite DB + throwaway JWT secret, both
  deleted after) — **23/23 checks passed**, including: two
  orgs with distinct namespaces; upload A = 7 chunks, upload B
  = 3 chunks, counts match; query A namespace + A filter
  returns only A chunks; same namespace + B filter returns
  nothing; vector ids org-prefixed; vectors carry `org_id`
  metadata; re-upload for B clears only B (A stays 7);
  failed PDF parse raises and leaves A's vectors and active
  DB policy intact; status reports the org's own namespace;
  `copy_namespace` copies 2 legacy vectors with migrated ids
  and `org_id` metadata and leaves the legacy namespace
  untouched; deleting the legacy namespace empties only it;
  migrate with empty legacy succeeds with 0 copied and
  `deleted_global False`; second migrate refused; migrate
  with legacy repopulated copies 1, deletes legacy, and does
  not overwrite A's existing vectors (7 → 8); two orgs can
  both have "Engineering"; same-org duplicate blocked;
  `namespace_for_org` generates a missing namespace.
- Alembic migration on SQLite (Phase 2-era DB built from the
  Phase 2 models, stamped at `d8e9f0a1b2c3`): `upgrade head`
  → `downgrade d8e9f0a1b2c3` → `upgrade head` — **passed**;
  final version `f3c4d5e6a7b8`; after upgrade the departments
  table has only the composite unique constraint and
  `pinecone_migrated` exists; cross-org "Engineering" allowed,
  same-org duplicate blocked; employee rows survived the
  rebuild; downgrade with cross-org duplicate names refuses
  with a clear error and leaves the DB at head; clean
  downgrade restores `UNIQUE (name)` and drops the flag, and
  re-upgrade restores the composite constraint.
- Two real bugs found by the smoke test and fixed: (1)
  `query_namespace` fell through to `.get()` on a result
  object when `matches` was empty (falsy list) — now handles
  dict and object results correctly; (2) migration
  verification compared the namespace count to `copied`
  instead of `before + copied`, which failed whenever the
  org already had its own vectors.
- One real migration problem found and fixed: the first
  SQLite batch-mode attempt kept the global `UNIQUE (name)`
  alongside the composite constraint (the old constraint is
  unnamed in reflection, so batch mode could not drop it).
  The migration now rebuilds the table with explicit DDL on
  SQLite; also found that a failed downgrade left a
  `departments_new` table behind (SQLite DDL here is
  non-transactional), so the swap now drops it first, and
  downgrade pre-checks for cross-org duplicate names.
- Secret check: `grep -rn "sk-"` over the whole tree —
  **3 lines**, all the literal string `sk-` inside
  `PHASE1_SUMMARY.md` / `PHASE2_SUMMARY.md` describing the
  check itself, not a secret; no `.env` file in the tree.
- All throwaway artifacts deleted: tsc scratch copy,
  smoke-test venv, test databases, smoke-test script and
  logs, test policy files, and the `__pycache__` directories
  the checks created in the tree.

## NOT DONE — Phase 3 does not finish everything

- **No Manager role exists yet.** The `visible_user_ids`
  manager branch and `manager_id` column (Phase 2) are ready,
  but no user can hold a manager role.
- No audit log, no rate limiting, no email verification, no
  SSO, no MFA, no per-org time rules (attendance rules are
  still the global 10:00–10:15 / 19:00, Asia/Karachi).
- The Postgres parts of the migration (dropping the old
  unique constraint by inspected name, creating the composite
  constraint, adding the boolean column) were **not**
  executed against a real Postgres database — run `alembic
  upgrade head` against Postgres before relying on it.
- **Live Pinecone + OpenAI end-to-end was not run here**
  (no live keys in this environment). The fake-index tests
  prove the isolation logic; the first real upload and the
  first real Policy Assistant answer per org must be checked
  against live Pinecone after deployment.
- The old shared Pinecone policy is **not** migrated
  automatically: an admin must call
  `POST /api/v1/policy/migrate-namespaces` once per org after
  deploying. After the first org migrates, the legacy
  namespace is deleted, so later orgs get `copied_count 0`.
- If an upload fails after the namespace was cleared but
  before the upsert completes, the namespace holds a partial
  new policy while the DB still shows the old active policy;
  re-uploading the document repairs it.
- `settings.pinecone_namespace` is deprecated but still
  present in config; remove it only after every org has
  migrated.
