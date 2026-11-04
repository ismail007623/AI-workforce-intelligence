# AI Workforce Attendance Intelligence

AI-powered HR attendance tracking with Employee and HR portals.

## Stack

**Backend:** FastAPI + PostgreSQL + LangGraph + OpenAI + SMTP  
**Frontend:** Next.js 15 + TypeScript + Tailwind CSS + TanStack Query + Recharts  
**Tooling:** [uv](https://docs.astral.sh/uv/) (Python), npm (frontend)

## Quick Start

### 1. Backend

```bash
uv sync
```

Configure `.env` at project root (see `.env` for `DATABASE_URL`, `OPENAI_API_KEY`, SMTP settings).

```bash
uv run --directory backend alembic upgrade head
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Portals

### Employee Portal
- Check In / Check Out
- Late Reason Validation
- My Attendance History
- My Attendance Summary
- HR Policy Chatbot

### HR Portal
- Company Attendance Dashboard
- Late Employees
- Absent Employees
- Department Analytics
- AI Attendance Insights
- Company Policy

Select **Employee** or **HR** on the landing page. Employees pick their profile from the dropdown (no login required for POC).

## Attendance Rules

| Rule | Value |
|------|-------|
| On time | Check-in 10:00 AM – 10:15 AM |
| Late | Check-in 10:16 AM or later |
| Early leave | Check-out before 7:00 PM |

## Environment

**Root `.env`** — backend (database, OpenAI, SMTP)

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Docker (Backend only)

```bash
cd backend
copy .env.example .env
docker compose up --build
```

## uv Commands

| Command | Description |
|---------|-------------|
| `uv sync` | Install Python dependencies |
| `uv run --directory backend alembic upgrade head` | Run migrations |
| `uv run uvicorn main:app --reload` | Start API |
| `uv run python -m backend.app.seed_cli` | Seed sample data |

## API Examples

```bash
curl http://localhost:8000/api/v1/employees
curl http://localhost:8000/api/v1/dashboard/summary
curl http://localhost:8000/api/v1/attendance/today/absent
curl http://localhost:8000/api/v1/attendance/employee/EMP001/summary
```

Ensure PostgreSQL is running and `DATABASE_URL` uses `127.0.0.1` (not `localhost` on Windows).

## API documentation

See [docs/API.md](docs/API.md) for the full endpoint inventory and frontend integration map.
