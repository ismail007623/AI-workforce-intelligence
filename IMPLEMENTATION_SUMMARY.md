# Landing implementation — approved sample design in real code

Built 2026-11-19 from the approved `ai-workforce-flowpilot-style-hero` sample.
Base: pushed `main` head `82a9e0d4` (verified — local `frontend/app/page.tsx`
sha256 matched the remote file exactly before building). **Frontend only —
nothing under `backend/` was changed. Not pushed to GitHub.**

## Hero fix — 2026-11-19 (match the sample exactly)

After the first build, the running hero did not match the approved sample
(`image-63.png` / `image-64.png`), so the hero — navbar + hero only — was
rebuilt to match it exactly. Base for this fix: pushed `main` head `58ce94ec`
(verified before building). **Frontend only, hero only. Features, How It
Works, Pricing, PaymentModal, footer and the login/signup/company-signup
pages are untouched. Not pushed to GitHub.**

What was wrong, and what now matches the sample:

- **Navbar:** was a plain flat bar with the small image logo. Now a floating
  white pill (`fixed`, top 12px, rounded-full, soft shadow) over the lavender
  hero: purple badge + "AI Workforce" / "ATTENDANCE INTELLIGENCE" on the
  left, Features (lavender active pill) / How it works / Pricing, white pill
  "Log in" + solid purple pill "Get started" on the right. Session behaviour
  unchanged (logged in: name + Dashboard + Log out). The purple top strip is
  gone. The sample's scrolled screenshot shows the sticky pill overlapping
  and clipping the headline — that is NOT reproduced: the hero has generous
  top padding (128px mobile / 168px desktop) so the full headline is visible
  at load, and `scroll-padding-top: 120px` + `scroll-margin-top: 120px` keep
  anchor jumps clear of the pill.
- **Headline:** was 56px on two lines. Now 52px / 68px / 76px, three lines —
  "Turn attendance" / "data into" / "workforce intelligence." — the last
  line in the purple→blue gradient. Hero is ~85vh with the same generous
  spacing, plus faint decorative curved lines on the lavender background.
- **Dashboard:** was flat and plain. Now a white card with a full-width top
  bar (small logo + "AI Workforce", green LIVE pill, bell icon, purple
  avatar + "HR Admin" + chevron), a white sidebar with the Dashboard item as
  a solid purple pill (Attendance, Employees, AI Insights, Policies,
  Reports, Settings), "Workforce Overview" with a "This Month" dropdown,
  four bordered stat cards with icons and coloured delta pills (Total
  Employees 248; On-time Rate 94% with green ↑ +1% pill — was +4%; Late
  Arrivals 16 with red ↓ −37% pill — was green; Overtime 128 h), an
  "Attendance Trend" card with y-axis labels (100%–80%) and a floating
  "94% On-time rate" callout bubble over the line, and an "AI Insight" card
  beside it. Kept from the previous build: count-up numbers, the
  self-drawing trend line with travelling dot, the 3D tilt (static tilt,
  float on the wrapper), the LIVE pill, and reduced-motion support.
- **Ticker row:** was a green dot + one line of text. Now the sample's row:
  coloured avatar with initials, name — department, "Checked in · X min
  ago", and a green "On time" pill on the right. Still rotates the same four
  names every ~3s (Usman Ali, Ali Raza, Hira Shahid, Bilal Ahmed).
- **Benefits:** were a vertical green-check checklist. Now a horizontal row
  of three items at the bottom of the hero, each with a small icon in a
  circle: "Save time — Automate HR tasks", "Spot issues early — With AI
  insights", "Keep data private — Your data, your company".
- **Buttons unchanged:** orange `#F0760A` "Get started free →" (#plans) and
  white "See how it works" (#how).

Verification for this fix (fresh scratch copy, deleted after):

- `npx tsc --noEmit`: exit 0
- `npx next build`: exit 0, all 20 pages generated (`/` 15.4 kB / 128 kB)
- `python3 -m compileall backend main.py`: exit 0; `backend/` untouched
- Greps on the 2 changed files (`frontend/app/page.tsx`,
  `frontend/app/globals.css`): forbidden-word check: **0**; `sk-`: **0**
- Smoke test (production server): `/` 200 (74,119 bytes), `/login` 200;
  served `/` contains "Turn attendance", "workforce intelligence",
  "Workforce Overview", "On-time rate", "This Month", "On time",
  "Usman Ali", "Attendance Trend", "AI Insight"; 0 forbidden words.
  Note: one smoke-test run first hit a stale server left running from the
  earlier implementation task on the same port (it served the old build);
  it was stopped and the test re-run against the fresh build — the numbers
  above are from the fresh build.

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

- **Navbar:** floating white pill (`fixed`, top 12px, rounded-full, soft
  shadow) over the lavender hero. Purple badge + "AI Workforce" /
  "ATTENDANCE INTELLIGENCE". Links: Features (lavender active pill),
  How it works, Pricing. Logged out: white pill Log in + solid purple pill
  Get started. Logged in: name + Dashboard + Log out. Mobile hamburger
  menu opens a white rounded card under the pill. Hero top padding
  (128px / 168px) and 120px scroll offsets keep the headline clear of
  the pill.
- **Hero:** soft lavender background with faint decorative curves, ~85vh
  min-height, 1280px container. Headline 52px / 68px / 76px in three lines
  ("Turn attendance" / "data into" / "workforce intelligence.", last line
  in a purple→blue gradient). Subtext: "Automate attendance, catch issues
  early, and turn workforce data into actionable HR insights." Orange
  `#F0760A` "Get started free →" (#plans) + white "See how it works"
  (#how). Three benefits in a horizontal row with circled icons. Right:
  3D tilted dashboard — full-width top bar (logo, LIVE pulsing pill, bell,
  purple avatar + HR Admin), white sidebar with solid purple Dashboard
  item, "Workforce Overview" + "This Month" dropdown, four bordered stat
  cards with icons and coloured delta pills (248 / 94% ↑+1% green /
  16 ↓−37% red / 128 h), Mon–Fri trend line that draws itself with a
  travelling dot, y-axis labels, floating "94% On-time rate" callout,
  AI Insight card with the exact 37% text, live check-in ticker with
  avatar + "On time" pill rotating Ali Raza / Hira Shahid / Bilal Ahmed /
  Usman Ali every 3s. No floating toasts, no trusted-by row, no eyebrow
  pill. Reduced motion shows final values with no animation.
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

## Hero background + dashboard card fix — 2026-11-19

Ismail checked the pushed hero on localhost and the background colour did
not match the sample, then sent a close-up of the sample dashboard card.
Pixel-sampled from his screenshots: the sample hero background is a soft
lavender gradient (light #F3F0FF at the left, #E1D5FE at the top-right,
#D9D2F5 at the bottom-right corner); the built hero was one flat #F7F5FE.
Fixed in `frontend/app/page.tsx` + `frontend/app/globals.css`:

- Hero background is now the `.hero-bg` gradient (115deg linear +
  bottom-right radial glow), with the decorative curves slightly deepened
  so they still read on it.
- 94% callout bubble: `whitespace-nowrap` + centred over the chart
  (left 55%, translate -50%), so "On-time rate" stays on one line and the
  bubble no longer covers most of the chart.
- Stat cards: value 22px → 20px, delta pill tightened, card padding
  reduced, so the number and its pill sit on one line like the sample.
- Trend line: stroke 2.5 → 3, area fill 0.06 → 0.12, path reshaped to the
  sample (dip at Wed), two static dots added at Tue and Thu, travelling
  dot kept.

Verified: `tsc --noEmit` exit 0, `next build` exit 0 (all 20 pages),
production smoke test `/` 200 + `/login` 200 with the gradient stops in
the built CSS, 0 forbidden words, 0 `sk-` in the changed files.
