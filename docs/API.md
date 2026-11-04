# API Endpoints and Frontend Integration Map

**Base URL:** `{NEXT_PUBLIC_API_URL}/api/v1` (default `http://localhost:8000/api/v1`)

All frontend calls go through `frontend/lib/api.ts`. HR-only routes automatically send `X-AWI-Role: hr` when the user selected HR on the landing page.

---

## Summary counts

| Category | Count |
|----------|-------|
| **Total backend endpoints** | **20** (1 health + 19 under `/api/v1`) |
| **Defined in `api.ts`** | **18** methods |
| **Used in frontend UI** | **18** methods |
| **Backend-only (no UI)** | **2** (`/health`, `POST /employees`) |

---

## 1. System (not in `api.ts`)

| Method | Endpoint | Frontend | Used by |
|--------|----------|----------|---------|
| GET | `/health` | No | Server health check only (not called from UI) |

---

## 2. Employees (`backend/app/routers/employees.py`)

| Method | Endpoint | `api.ts` method | Frontend page / component |
|--------|----------|-----------------|---------------------------|
| GET | `/api/v1/employees` | `getEmployees()` | `frontend/components/landing/RoleEntry.tsx` — employee picker on landing |
| POST | `/api/v1/employees` | — | **Not integrated** (create employee API exists, no UI) |

---

## 3. Insights (`backend/app/routers/employees.py`)

| Method | Endpoint | `api.ts` method | Frontend page / component |
|--------|----------|-----------------|---------------------------|
| POST | `/api/v1/insights/query` | `queryInsights(question)` | `frontend/app/hr/insights/page.tsx` — AI assistant |

---

## 4. Dashboard (`backend/app/routers/dashboard.py`)

| Method | Endpoint | `api.ts` method | Frontend page / component |
|--------|----------|-----------------|---------------------------|
| GET | `/api/v1/dashboard/summary` | `getDashboardSummary()` | `frontend/app/hr/page.tsx` — HR home KPIs |
| GET | `/api/v1/dashboard/trend?days=7` | `getAttendanceTrend(7)` | `frontend/app/hr/page.tsx` — 7-day chart |
| GET | `/api/v1/dashboard/departments` | `getDepartmentStats(sort_by?)` | `frontend/app/hr/page.tsx`, `frontend/app/hr/departments/page.tsx` |
| GET | `/api/v1/dashboard/departments/{name}/employees` | `getDepartmentEmployees(dept, sort_by?)` | `frontend/app/hr/departments/[department]/page.tsx` — AI runs only when `sort_by=late` |

---

## 5. Attendance (`backend/app/routers/attendance.py`)

| Method | Endpoint | Auth | `api.ts` method | Frontend page / component |
|--------|----------|------|-----------------|---------------------------|
| POST | `/api/v1/attendance/check-in` | — | `checkIn(employee_id)` | `frontend/components/employee/HeroCheckInCard.tsx` |
| POST | `/api/v1/attendance/check-out` | — | `checkOut(employee_id)` | `frontend/components/employee/HeroCheckInCard.tsx` |
| POST | `/api/v1/attendance/late-reason` | — | `submitLateReason(employee_id, reason)` | `frontend/components/employee/LateReasonModal.tsx` — save-only, no AI at submit |
| GET | `/api/v1/attendance/employee/{id}` | — | `getEmployeeHistory(id)` | `frontend/app/employee/page.tsx`, `frontend/app/employee/history/page.tsx` |
| GET | `/api/v1/attendance/employee/{id}/summary` | — | `getEmployeeSummary(id)` | `frontend/app/employee/page.tsx`, `frontend/app/employee/summary/page.tsx` |
| GET | `/api/v1/attendance/today` | — | `getTodayAttendance()` | `frontend/app/hr/page.tsx`, `frontend/app/hr/live/page.tsx` |
| GET | `/api/v1/attendance/today/absent` | — | `getTodayAbsent()` | `frontend/app/hr/absent/page.tsx` |
| GET | `/api/v1/attendance/today/late-intelligence` | HR header | `getLateIntelligence(sort_by)` | `frontend/app/hr/late/page.tsx` |

Note: `GET /api/v1/attendance/today?status=late` is available on the backend via the same `/attendance/today` route with a query param; the HR Late page uses `late-intelligence` instead.

---

## 6. Company Policy (`backend/app/routers/policy.py`) — all HR-only

| Method | Endpoint | `api.ts` method | Frontend page / component |
|--------|----------|-----------------|---------------------------|
| GET | `/api/v1/policy/status` | `getPolicyStatus()` | `frontend/components/hr/policy/PolicyPageContent.tsx` |
| GET | `/api/v1/policy/history` | `getPolicyHistory()` | `frontend/components/hr/policy/PolicyPageContent.tsx` |
| GET | `/api/v1/policy/download` | `downloadPolicyDocument()` | `frontend/components/hr/policy/CurrentPolicyCard.tsx` |
| POST | `/api/v1/policy/upload` | `uploadPolicyDocument(file)` | `frontend/components/hr/policy/PolicyUploadSection.tsx` |

---

## Flow by portal

### Landing
- `RoleEntry` → `getEmployees`

### Employee portal
- `HeroCheckInCard` → `checkIn`, `checkOut`
- `LateReasonModal` → `submitLateReason`
- `employee/page` → `getEmployeeSummary`, `getEmployeeHistory`
- `employee/history` → `getEmployeeHistory`
- `employee/summary` → `getEmployeeSummary`

### HR portal
- `hr/page` → `getDashboardSummary`, `getAttendanceTrend`, `getDepartmentStats`, `getTodayAttendance`
- `hr/departments` → `getDepartmentStats`
- `hr/departments/[department]` → `getDepartmentEmployees`
- `hr/late` → `getLateIntelligence`
- `hr/absent` → `getTodayAbsent`
- `hr/live` → `getTodayAttendance`
- `hr/insights` → `queryInsights`
- `hr/policy` → `getPolicyStatus`, `getPolicyHistory`, `uploadPolicyDocument`, `downloadPolicyDocument`

---

## Gaps (not wired to UI)

1. **`GET /health`** — infrastructure / ops only
2. **`POST /api/v1/employees`** — backend can create employees; no admin UI yet

---

## Quick reference: 19 `/api/v1` routes

1. `GET /employees`
2. `POST /employees` *(no UI)*
3. `POST /insights/query`
4. `GET /dashboard/summary`
5. `GET /dashboard/departments`
6. `GET /dashboard/departments/{name}/employees`
7. `GET /dashboard/trend`
8. `POST /attendance/check-in`
9. `POST /attendance/check-out`
10. `POST /attendance/late-reason`
11. `GET /attendance/today`
12. `GET /attendance/today/absent`
13. `GET /attendance/today/late-intelligence` *(HR)*
14. `GET /attendance/employee/{id}`
15. `GET /attendance/employee/{id}/summary`
16. `GET /policy/status` *(HR)*
17. `GET /policy/history` *(HR)*
18. `GET /policy/download` *(HR)*
19. `POST /policy/upload` *(HR)*

Plus **`GET /health`** outside `/api/v1`.
