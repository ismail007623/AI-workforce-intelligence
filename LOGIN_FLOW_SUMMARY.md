# Proper login pages — what changed

Built 2026-11-11, on top of the pushed migration-fix commit `0ee113cb`.
Nothing pushed, nothing changed in Ismail's repo. This working copy is the
full project tree; only the files below differ from `main`.

## The problem (Ismail's screenshot, localhost:3001, 2026-11-11)

The landing page itself was the login screen: two big cards, "I'm an
Employee" and "I'm HR / Manager", each with a "Sign in" link, and a navbar
with only Features / How it works / "Get started". Problems found in the
code while fixing it:

- The navbar "Get started" button pointed to `#get-started`, a dead
  anchor — it only scrolled to the two cards, it went nowhere.
- Both role cards linked to the same `/login` page, so the choice on the
  landing page did nothing — the server decides the portal from the
  account role after login, the cards only pretended to choose.
- The `/login` page carried a stale, wrong note: "HR signup is open in
  this POC." Phase 1 already closed HR signup (employee-only signup,
  HR only by invite). The note said the opposite of the code.

## What changed

- `frontend/app/page.tsx` (landing page)
  - Now a client component using `useSession`.
  - Navbar, logged out: plain **Log in** link (`/login`) + purple
    **Get started** button (`/company-signup` — register a company).
  - Navbar, logged in: your name + **Dashboard** (HR/Admin → `/hr`,
    employee → `/employee`) + **Log out** (calls session logout, back
    to the landing page).
  - Hero: the two "I'm an Employee / I'm HR" cards are gone, replaced
    by two proper buttons — **Get started** (`/company-signup`) and
    **Sign in** (`/login`) — plus the trust line "Employees can only
    access their own records. HR has organization-wide visibility."
  - Bottom CTA button "Get started" now goes to `/company-signup`
    instead of the dead `#get-started` anchor.
  - Features, workflow, stats and footer are unchanged.
- `frontend/components/landing/RoleEntry.tsx` — deleted (only used by
  the landing page).
- `frontend/app/login/page.tsx`
  - The stale "HR signup is open" note is replaced with the true
    explanation: "One login for everyone. After you sign in, you go to
    your own portal — employees see only their own records, HR sees
    the whole company. HR accounts are created by invitation only, so
    nobody can sign up as HR."
  - Added a "Registering a company? Register your company" link
    (`/company-signup`) next to "Create an account" (`/signup`).
  - The form itself is unchanged: email + password only, no role
    choice, the server decides the portal from the account role.
- `frontend/app/signup/page.tsx`
  - Added the same "Registering a company? Register your company"
    link. The employee-only form itself is unchanged.

## The user flow, in simple words

1. A company owner clicks **Get started** → `/company-signup` →
   creates the company and becomes its first Admin → lands on `/hr`.
2. The Admin (or HR) invites HR from `/hr/invitations` → the invited
   person accepts the link, sets a password → HR account → lands on
   `/hr`.
3. HR adds employees first, then an employee clicks **Create an
   account** (`/signup`), links to their existing employee record
   with their Employee ID → lands on `/employee`.
4. Everyone after that uses **Log in** (`/login`): email + password
   only. The server looks at the account and sends HR to `/hr` and
   employees to `/employee`. Nobody can pick "HR" for themselves.

## How to check it

Replace the code with this working copy (or `git pull` after it is
pushed), then in `frontend/`: `npm install`, `npm run dev`.

1. Open `localhost:3000` logged out: navbar shows **Log in** +
   **Get started**. The hero has the two buttons, no role cards.
2. Click **Log in**: proper login page, email + password, the new
   explanation at the bottom, "Create an account" and "Register your
   company" links.
3. Log in as an employee: you land on `/employee`. Go back to `/`:
   navbar now shows your name + **Dashboard** + **Log out**.
4. Click **Log out**: back to the logged-out navbar.
5. Click **Get started**: company signup page. Click **Create an
   account** on the login page: employee signup page.

## Verification done here (2026-11-11)

- `npx tsc --noEmit` in the frontend: exit 0.
- No backend change. No secrets, no `.env` in the tree.
- No live browser run (no backend running here); Ismail's own run on
  localhost is the real check of the logged-in navbar and the logout.
