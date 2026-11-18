# Taqwi-style redesign — purple theme (2026-11-18)

The AI Workforce frontend restyled in taqwi.ai's design language, keeping
our own purple colour theme exactly. Design restyle only: no backend
changes, no API/route/auth/business-logic changes, no new dependencies,
no repo push yet.

## What changed

### Design tokens (`frontend/app/globals.css`)
Kept exactly (no orange, no deeper purple `#780098`):
- Primary `#6554E8`, hover `#5543D4`, dark text `#17172B`, secondary text
  `#6B7085`, background `#FFFFFF`, soft section `#F8F8FC`, subtle purple
  `#F3F1FF`, border `#E8E9F1`, success `#15966A`, warning `#D58B25`,
  error `#DC5263`.
- Font: Inter for everything. Added JetBrains Mono (via the same Google
  Fonts import as Inter, fallback `ui-monospace`) used ONLY for small
  eyebrow labels.
- Flat cards: `--shadow-card` / `--shadow-card-hover` / `--shadow-hero`
  reduced to a barely-there 1–3px faint shadow; hairline 1px borders do
  the work. New `--shadow-overlay` (faint, for drawers/modals/dropdowns
  only).
- Card radius: `--radius-lg` / `--radius-xl` now `20px`.
- New utilities: `.eyebrow` (mono, 12px, uppercase, 0.18em
  letter-spacing), `.outline-number` (giant outlined number; active one
  solid purple), `.bar-fill` (width transition), `.reveal` (fade-in on
  scroll via IntersectionObserver; content stays visible if the observer
  is unavailable), `.top-strip` (3px solid purple strip), `.ai-bridge-gradient`
  (purple `#6554E8` → light purple `#A29BFE`, never orange),
  `.font-mono-taqwi`.

### Landing page (`frontend/app/page.tsx`, rewritten)
Same content, routes, copy and navbar behaviour as the premium redesign,
restyled:
- Thin solid purple strip along the very top; sticky white navbar with
  hairline bottom border; logged-out "Log in" is a white pill with a
  hairline border, "Get started" a solid purple pill; logged-in name +
  Dashboard (white pill) + Log out (solid purple pill); mobile hamburger
  menu kept.
- Hero, two columns. Left: mono eyebrow "AI-POWERED WORKFORCE
  INTELLIGENCE"; H1 ~56px, weight 800, line-height ~1.05, second sentence
  in purple; same description and CTAs (pill buttons). Right: an **AI
  Bridge diagram, not a dashboard screenshot** — an "Employee" card
  ("Check in, see only my own record") and an "HR / Manager" card ("The
  whole company at a glance") joined by a line through a central round
  purple-gradient node labelled "AI Bridge"; below it a white card with
  three animated bars (Present 11, Late 2, Absent 1 of 14) that fill on
  load, every figure labelled "Demo data".
- Sections in order: 3 benefits (with eyebrow "WHY AI WORKFORCE");
  capabilities — HR features as numbered rows 01–06 with giant outlined
  numbers (01 solid purple, the rest pale lavender) and hairline dividers,
  employee features as 5 flat cards; 6-step How it works with outlined
  step numbers; AI Insights showcase (same example question, answer,
  figures and recommendation, every figure labelled "Illustrative
  example"); two big role panels (Employee / HR) with sign-in links;
  final CTA on dark `#17172B`; simple 4-column footer (Brand, Product,
  Account, Explore — all links are real anchors or existing routes).
- No fake stats, testimonials, logos or pricing. All demo figures are
  labelled "Demo data" / "Illustrative example".

### Login pages — taqwi split-card style (`frontend/components/auth/AuthSplitLayout.tsx`, new)
One large centred white card split in two, used by all three auth pages.
Left brand panel (pale lavender `#F3F1FF`): heading "Your AI Copilot for
Workforce Intelligence" ("Workforce Intelligence" in purple), subtext,
a centre circle "AI Workforce" ringed by 6 chips (Check-in, History,
Policy, Insights, Late, Departments), and a "Highlighted capability"
card that cycles through 3 items every 4 seconds. Right form panel:
form heading, pill inputs, full-width solid purple pill button.
- `/login`: "Welcome back" / "Sign in to access your AI Workforce
  workspace". Email + password pill inputs, show-password eye toggle,
  "Log in" pill button, links "Create an account" and "Register your
  company", shield line "Your data is secure with us", and the true rule
  text (one login for everyone, server decides the portal, HR by invite
  only). Form fields, validation and API calls unchanged.
- `/signup` (employee only): same split layout; fields unchanged (full
  name, email, employee ID, password, confirm password); note "Employee
  only. HR accounts are by invite only."
- `/company-signup`: same split layout; fields and logic unchanged
  (company name, admin name, email, password, work hours, timezone,
  grace minutes).

### Portals (employee + HR)
Flat hairline style throughout, logic untouched: `--shadow-card` token
flattening flows into every card; `components/ui/button.tsx` buttons are
now fully pill-shaped; remaining primary buttons in pages/components
changed to pill; hard shadows on drawers/modals/dropdowns replaced with
the faint `--shadow-overlay`; sidebar stays 240px with token active
states; content max-width is now 1210px (`AppShell`, employee page).
Mono eyebrows added to section headings via a new optional `eyebrow`
prop on `PageHeader` (Company Policy, Live Attendance, AI Insights,
Departments, Absent Employees, My Summary, My Attendance) and to the HR
and employee dashboard greetings ("Overview", "My workspace").
KPI cards still show real API values only — no fabricated trends.

## Files changed (28)
- `frontend/app/globals.css`
- `frontend/app/page.tsx` (rewritten)
- `frontend/app/login/page.tsx` (rewritten)
- `frontend/app/signup/page.tsx` (rewritten)
- `frontend/app/company-signup/page.tsx` (rewritten)
- `frontend/components/auth/AuthSplitLayout.tsx` (new)
- `frontend/components/ui/button.tsx`
- `frontend/components/shared/PageHeader.tsx`
- `frontend/components/shared/AttendanceChart.tsx`
- `frontend/components/layout/AppShell.tsx`
- `frontend/components/layout/ComingSoonModal.tsx`
- `frontend/components/hr/late/LateFilterBar.tsx`
- `frontend/components/hr/departments/DeptDrawer.tsx`
- `frontend/components/employee/LateReasonModal.tsx`
- `frontend/components/employee/ProgressBanner.tsx`
- `frontend/components/employee/HeroCheckInCard.tsx`
- `frontend/app/hr/page.tsx`, `frontend/app/hr/live/page.tsx`,
  `frontend/app/hr/insights/page.tsx`, `frontend/app/hr/departments/page.tsx`,
  `frontend/app/hr/departments/[department]/page.tsx`,
  `frontend/app/hr/absent/page.tsx`, `frontend/app/hr/policy/page.tsx`,
  `frontend/app/hr/invitations/page.tsx`,
  `frontend/app/employee/page.tsx`, `frontend/app/employee/history/page.tsx`,
  `frontend/app/employee/summary/page.tsx`,
  `frontend/app/invitations/accept/page.tsx` (pill button only)

Nothing under `backend/` was touched.

## Demo data
- Hero bars: Present 11, Late 2, Absent 1 of 14 — labelled "Demo data".
- AI Insights showcase: Sales 6 / Engineering 4 late arrivals, 14 total,
  Monday cluster, Sunday-evening reminder — labelled "Illustrative
  example".
- Role panels: Present 11 / Late 2 / Absent 1 and the "Checked in — On
  time 09:58 AM" card are the same demo figures as the previous redesign.

## Deliberately left out
- **Google / OTP / social login buttons** — taqwi has them; our product
  only has email + password login. Adding them needs backend work, not
  design. The preview/login pages show email + password only.
- **"Remember me" checkbox** — no such feature in our session (the
  refresh token already lasts 7 days).
- **`/invitations/accept` page** — only its primary button was made pill;
  the page was not converted to the split-card layout (out of scope).
- The interactive Employee/HR capability tabs and dashboard preview
  from the previous redesign were removed with the rewrite; the same
  feature copy now appears as numbered rows (HR, all 6) and flat cards
  (employee, all 5). No capability was added or removed.

## How to run and check
From the project root (after `git pull`, once pushed):
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3000 and check: the landing page (purple top
strip, pill navbar, AI Bridge hero with animated bars, numbered HR rows,
employee cards, dark final CTA), `/login`, `/signup`,
`/company-signup` (split card, brand panel with orbit chips and cycling
capability card), `/employee` and `/hr` (flat cards, pill buttons, mono
eyebrows). Desktop and mobile.

## Verification (2026-11-18, this machine)
- `npx tsc --noEmit` in the frontend: exit 0.
- Full production `npx next build`: exit 0, all 20 pages generated
  (`/`, `/login`, `/signup`, `/company-signup`, `/employee`,
  `/employee/history`, `/employee/summary`, `/employee/policy-chat`,
  `/hr`, `/hr/absent`, `/hr/departments`, `/hr/departments/[department]`,
  `/hr/insights`, `/hr/invitations`, `/hr/late`, `/hr/live`, `/hr/policy`,
  `/invitations/accept`, `/_not-found`).
- Production server smoke test: `/`, `/login`, `/signup`,
  `/company-signup` all returned 200 with the expected content ("AI
  Bridge" diagram, "Welcome back", brand panel, "Demo data" label).
  No headless browser was available here, so no screenshot was taken —
  visual check on `localhost:3000` by Ismail is still the real check.
- `python3 -m compileall backend main.py`: passed (backend untouched).
- Secret check: `grep -rn "sk-"` over the changed files: 0 matches.
  No `.env` file anywhere in the tree.
- Deps were installed with `npm ci` in a scratch copy under
  `~/workspace/` (never `/tmp`); the scratch copy was deleted after the
  build, and the test server was stopped.
