# Landing implementation — approved sample design in real code

Built 2026-11-19 from the approved `ai-workforce-flowpilot-style-hero` sample.
Base: pushed `main` head `82a9e0d4` (verified — local `frontend/app/page.tsx`
sha256 matched the remote file exactly before building). **Frontend only —
nothing under `backend/` was changed. Not pushed to GitHub.**

## What changed (3 files)

- `frontend/app/page.tsx` — replaced wholesale with the 5-part flow:
  Navbar → Hero → Features → How It Works → Pricing → Footer.
  Old sections deleted: AI Bridge hero, benefits, numbered HR rows, employee
  cards, 6-step workflow, AI insights showcase, role panels, dark final CTA.
  The `recharts` import is gone. Session behaviour kept exactly
  (`useSession`, role-based Dashboard href, `logout()` + `router.push("/")`).
  Login, signup and company-signup pages untouched.
- `frontend/components/landing/PaymentModal.tsx` — **new**, UI-only payment
  modal (see below).
- `frontend/app/globals.css` — **appended only**: hero gradient text,
  `.hero-tilt` (perspective 1500px, rotateY −9° / rotateX 3°, flat ≤600px),
  `.hero-float` (float on the wrapper only, so tilted text stays sharp),
  `.live-dot` pulse, ticker animation, pricing-card hover. Existing
  `prefers-reduced-motion` rules cover the new keyframes.

## The page

- **Navbar:** sticky, 76px, white + hairline border. Links: Features,
  How it works, Pricing. Logged out: Log in + Get started pills. Logged in:
  name + Dashboard + Log out. Mobile hamburger menu.
- **Hero:** soft lavender background, ~82vh min-height, 96px vertical padding,
  1280px container. Headline "Turn attendance data into workforce
  intelligence." (second sentence in a purple→blue gradient). Subtext:
  "Automate attendance, catch issues early, and turn workforce data into
  actionable HR insights." Orange `#F0760A` "Get started free →" (#plans) +
  white "See how it works" (#how). Three checkmark mini-benefits. Right: 3D
  tilted dashboard (sidebar, HR Admin top bar, LIVE pulsing pill, count-up
  stats 248 / 94% ↑+4% / 16 ↓−37% / 128 h, Mon–Fri trend line that draws
  itself with a travelling dot, 94% callout, AI Insight card with the exact
  37% text, live check-in ticker rotating Ali Raza / Hira Shahid /
  Bilal Ahmed / Usman Ali every 3s). No floating toasts, no trusted-by row,
  no eyebrow pill. Reduced motion shows final values with no animation.
  NOTE: the dashboard numbers (248, 94%, 16, 128h) and the Features numbers
  (96%, 12, 7, 7h 48m, 32h 15m) are the reference design's showcase numbers,
  implemented exactly as shown — not real product data.
- **Features (`#features`):** "PRODUCT FEATURES" pill (green dot), bento grid —
  large Employee Portal card (5 green-check items + "My Attendance" panel:
  09:02 AM, 7h 48m, 32h 15m, Policy Chatbot row), AI Attendance Insights
  card, two small cards (self-service / HR visibility), large dark-purple
  HR Portal card (6 white-check items + white dashboard panel: 96% / 12 / 7,
  Eng/Sales/Ops/HR/Finance bars, Company Policy box).
- **How It Works (`#how`):** lavender, 3 cards with purple arrows: 01 Set up
  your company (Acme Technologies, avatars, Company Policy.pdf), 02 Track
  attendance (09:00 AM, Mon 19 Nov, Checked In pill, Check Out button),
  03 Get AI insights (37% text + recommendation box). Bottom strip: Quick
  setup / Seamless for your team / Actionable from day one.
- **Pricing (`#plans`):** working Monthly/Annual toggle with Save 20% badge
  (Annual drops Pro $49 → $39; Free $0, Enterprise Custom unchanged).
  Three compact cards with hover lift + purple shadow/border. Pro is Most
  Popular with a tinted feature list. Trust row: Secure & Reliable,
  Quick Setup, Dedicated Support.
- **Footer:** existing 4-column footer kept. The old footer tagline was
  removed from the bottom bar. No link points to `#insights`, `#portals`,
  or `#faq`.
- **Removed:** AI Insights standalone section, Portals section, FAQ section,
  closing CTA banner, trusted-by logos, hero eyebrow pill.

## Payment UI — UI ONLY, no integration

"Subscribe to Free" / "Subscribe to Pro" open a modal with the chosen plan
and price, card fields (card number, expiry, CVC, name on card) and a Pay
button. **No Stripe/Paddle SDK, no API calls, no `fetch`, no keys, nothing is
sent anywhere.** On submit it shows only: "Payment integration coming soon —
this is a preview only." Closes via X, backdrop click, or Escape. "Contact
sales" is a plain button (no modal, no navigation). Payment integration is a
separate step at the end, as agreed.

## Verification (independently re-run by the reviewer, not just the builder)

- `npx tsc --noEmit`: exit 0
- `npx next build`: exit 0, all 20 pages generated (`/` 14.3 kB / 127 kB)
- `python3 -m compileall backend main.py`: exit 0; `backend/` untouched
- Greps on the 3 changed files: forbidden-word check (the usual list,
  case-insensitive): **0**; `sk-`: **0**;
  `fetch(` in PaymentModal: **0**; `#insights` / `#portals` / `#faq`: **0**
- Smoke test (production server): `/` 200, `/login` 200; served `/` contains
  "Turn attendance data", "Simple pricing", "PRODUCT FEATURES",
  "three simple steps", "Subscribe to Pro", "Get started free",
  "Acme Technologies"; 0 forbidden words; the exact payment note string is
  present in the built JS chunk
- Orange appears only on the hero primary CTA (`#F0760A`, hover `#D96508`);
  the only other "orange" match is a pre-existing CSS comment saying
  "never orange"

## How to run and check

1. Back up your project, then replace the code with this zip (keep your own
   `.env`).
2. `cd frontend && npm install && npm run dev`
3. Open `http://localhost:3000` and check: navbar (logged out / logged in),
   hero (count-up numbers, drawing trend line, rotating check-ins), Features,
   How It Works, Pricing (toggle Monthly/Annual, hover on cards, click
   "Subscribe to Pro" → payment modal → submit → "Payment integration
   coming soon" note), footer.
4. Not checked in a live browser here: count-up, line-draw, ticker, float,
   modal open/close and the annual toggle were verified by code + successful
   server render only — please confirm them by clicking through on localhost.

## Not done here

- No GitHub push (separate step after your check).
- No payment integration (UI only, by design).
- No backend, route, API, auth, or business-logic changes.
