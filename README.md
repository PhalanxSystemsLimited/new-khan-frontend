# New Khan Bus Service — Frontend

The public website and booking app for New Khan: home page, fleet and routes, terminals, policies, cargo/charter
enquiries, and the full seat-booking flow (search → seats → reserve → pay → ticket), in **English and Urdu (right to left)**.

| | |
|---|---|
| Stack | React 18 (JSX, no TypeScript), React Router 6, Tailwind CSS 4, Vite 5 |
| Output | Static files in `dist/` (single-page app): host on any static host / Apache / Nginx |
| Backend | [`../backend`](../backend/README.md) (only needed in `live` mode) |
| Design | Copy of the approved **Pakka** design of the live site (`PhalanxSystemsLimited/NewKhan-Frontend`, commit 5dc455a) |

---

## Contents

1. [Quick start](#1-quick-start)
2. [Environment variables and the two modes](#2-environment-variables-and-the-two-modes)
3. [Folder layout](#3-folder-layout)
4. [Pages and addresses](#4-pages-and-addresses)
5. [Booking flow (what the customer sees)](#5-booking-flow-what-the-customer-sees)
6. [Admin panel](#6-admin-panel)
7. [Languages (English / Urdu)](#7-languages-english--urdu)
8. [Styling](#8-styling)
9. [Building and hosting](#9-building-and-hosting)
10. [Common changes: where to edit](#10-common-changes-where-to-edit)
11. [Known limitations](#11-known-limitations)

---

## 1. Quick start

```bash
cd frontend
npm install
cp .env.example .env     # choose mock or live, see §2
npm run dev              # http://localhost:5173 (redirects to /en)
npm run build            # production build into dist/
npm run preview          # serve dist/ locally to check the build
```

Requires Node 20+. There is no test suite or linter configured.

---

## 2. Environment variables and the two modes

Vite variables are **baked in at build time**: change `.env`, then rebuild (or restart `npm run dev`).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` or `live` (see below) |
| `VITE_API_URL` | `http://localhost:4000/api/v1` | Backend base URL, **including** `/api/v1` (live mode only) |
| `VITE_WEB3FORMS_KEY` | – | Optional [Web3Forms](https://web3forms.com) key for Cargo/Charter forms. Without it, submitting opens WhatsApp with the form pre-filled. Public by design. |

| Mode | What happens |
|---|---|
| **`mock`** (demo) | Everything runs in the browser: placeholder trips, fares and seats, simulated payment, bookings saved in this browser's `localStorage`. No backend, no sign-in, nothing charged. Seat hold is 3 hours. Good for design work and demos. |
| **`live`** | Talks to the backend. Real cities, trips, fares, seat maps. Booking requires signing in (email/password or phone code). Payments go to Safepay. Seat hold is the backend's `BOOKING_HOLD_MINUTES` (20 min). |

For live mode the frontend's address must be in the backend's `CORS_ORIGINS` (localhost is allowed automatically when the
backend isn't in production mode).

**Production build:** `VITE_API_MODE=live` and `VITE_API_URL=https://<your-api-domain>/api/v1`.

---

## 3. Folder layout

```
frontend/
├── index.html
├── vite.config.js            React + Tailwind plugins, dev port 5173
├── public/                   Copied as-is into dist/: logo, favicons, images (webp), hero video, .htaccess
└── src/
    ├── main.jsx              Mounts <App/>
    ├── App.jsx               All routes (/:lang/...), page layout (header, footer, sticky bar, toasts)
    ├── index.css             Theme + animations, then the Pakka design layer (pk-* classes)
    ├── pages/                Home, About, Fleet (also /routes), Terminals, Policies/Privacy/Terms,
    │                         Enquiries (Cargo, Charter), RoutePages (/routes/<from>-to-<to>, /routes/to/<town>), NotFound
    ├── components/
    │   ├── Chrome.jsx        Top bar, Header (nav menu, Services dropdown, Sign in/out), Footer,
    │   │                     first-visit language dialog, mobile sticky bar, WhatsApp button
    │   ├── RouteMap.jsx      Animated network map
    │   ├── DepartureBoard.jsx  "Leaving Lahore" split-flap board
    │   ├── Toast.jsx         Pop-up notifications (toast(), toastOnce())
    │   ├── EnquiryForm.jsx   Cargo / Charter forms (Web3Forms or WhatsApp)
    │   └── …                 Other page sections, cards, icons, pickers, motion helpers
    ├── admin/                Admin panel at /admin (see §6): AdminApp.jsx (sign-in, role check, menu), api.js,
    │                         ui.jsx (tables, forms, dialogs), pages/ (Operations, Network, Fleet, Commercial, People, Content)
    ├── booking/              The booking app (see §5)
    │   ├── api.js            THE ONLY data entry point: picks mock/mockApi.js or live/liveApi.js
    │   ├── live/liveApi.js   Calls the backend; maps backend data to the shapes the screens use
    │   ├── mock/             Demo implementation (mockApi.js) and placeholder trips/seats (trips.js)
    │   ├── auth.js           Live session store (tokens in localStorage "nk-session")
    │   ├── AuthDialog.jsx    Sign in / sign up / phone code dialog
    │   ├── BookingSearch.jsx Search form            ResultsClient.jsx  Trip results
    │   ├── SeatsClient.jsx   Seat selection + passenger details (SeatMap.jsx draws the bus)
    │   ├── BookingView.jsx   One booking in any state (held/confirmed/expired/cancelled), print ticket, cancel
    │   ├── PayClients.jsx    Payment method choice → Safepay redirect (live) / simulated gateway (mock)
    │   ├── MyBookings.jsx    My bookings list + "reservation expired" pop-up
    │   ├── BookingList.jsx   Booking card used in lists (status tag, countdown, Pay now)
    │   ├── ManageClient.jsx  Find a booking by mobile number (and optional reference)
    │   ├── strings.js        Every booking-screen text in English + Urdu (bt(key, lang))
    │   └── time.js, hooks.js, errors.js, useCities.js, Shell.jsx   Helpers
    ├── data/
    │   ├── site.js           Company details, helpline, cities, fares, timetable, terminals, FAQ (website content)
    │   ├── routeMap.js       Map geometry
    │   └── legal.js          Refund, service delivery, travel, privacy and terms texts
    └── lib/
        ├── i18n.js           Languages, ui strings (u(key, lang)), text direction
        ├── echo.js           Small Urdu lines printed under English headings
        ├── links.js          href(lang, path), phone/WhatsApp/maps links
        ├── content.js        Loads website content saved in the admin panel before the app starts (main.jsx)
        ├── routes.js, useLang.js, forms.js
```

---

## 4. Pages and addresses

Every address starts with the language: `/en/...` or `/ur/...` (`/` redirects to `/en`).

| Address | Page |
|---|---|
| `/en` | Home |
| `/en/fleet`, `/en/routes` | Fleet & Routes |
| `/en/routes/<from>-to-<to>`, `/en/routes/to/<town>` | Route pages |
| `/en/terminals` | Terminals |
| `/en/about` | About |
| `/en/policies`, `/en/privacy`, `/en/terms` | Legal pages |
| `/en/cargo`, `/en/charter` | Enquiry forms (under the **Services** menu) |
| `/en/book` | Booking search |
| `/en/book/results` → `/en/book/seats` | Results, seat choice |
| `/en/book/reserved?ref=` | A held booking, "Held, awaiting payment" |
| `/en/book/pay?ref=` → `/en/book/gateway` | Payment (gateway = mock simulator only) |
| `/en/book/confirmed?ref=` | Confirmed booking / ticket |
| `/en/book/booking?ref=` | Any other booking (expired, cancelled), "Booking details" |
| `/en/book/my-bookings` | **My bookings** (main nav) |
| `/en/book/manage` | **Find a booking** by mobile number (Services menu) |
| `/admin` | **Admin panel** (staff and admins only, English) |

**Header navigation:** Home · Fleet & Routes · Terminals · My bookings · Services ▾ (Parcels & cargo, Charter a bus, Find a booking) · About · Policies.
Defined at the top of [`src/components/Chrome.jsx`](src/components/Chrome.jsx) (`MAIN`, `SERVICES`, `MORE`).

---

## 5. Booking flow (what the customer sees)

1. **Search** (from, to, date, passengers) → **Results** → pick a bus.
2. **Seats**: tap a seat once for a female passenger (pink), twice for male (blue), a third time to free it. Booked seats
   show their passenger's gender; a male and a female from different bookings cannot sit side by side. Then enter passengers (name, phone…).
3. **Reserve** (live: must be signed in). Seats are held for **20 minutes**; the page shows a countdown and **Pay now**.
4. **Pay**: choose JazzCash / Easypaisa / Card → redirected to Safepay → back to the **Confirmed** page with the ticket (print button).
5. **My bookings** (`/book/my-bookings`):
   - **Reserved (unpaid)** bookings are pinned to the top. Their status tag is a live countdown (**⏱ 14:32 left**, red under
     5 minutes) with a **Pay now** button, so a customer can leave, compare other buses, and come back to pay.
   - **Confirmed / cancelled** bookings follow, newest first. "View booking" shows passengers, seats, times and terminals.
   - **Expired** (unpaid) bookings disappear from the list. The customer is told once with a pop-up
     ("Your reservation expired … seats released and available to book again", with **Book again**). "Seen" is saved on the
     **account** (backend `POST /bookings/expiry-seen`), so it isn't repeated on other devices. Only reservations that expired
     within the last 7 days get the pop-up.
   - Rare case: paid but expired with the seat already taken → stays visible with a red "contact us for a refund" note.
   - The list reloads when opened, on returning to the tab, on **Refresh**, and when a countdown hits zero.
6. **Find a booking** (`/book/manage`): by mobile number (lists all bookings for it) or number + reference; works without
   signing in (read-only). An opened booking has a **×** to close it.

All backend calls go through [`src/booking/api.js`](src/booking/api.js). Screens never call `fetch` themselves. The live
client refreshes the access token automatically and signs the user out if it is no longer valid.

> Payment methods offered on the Pay page in live mode are listed in `getPaymentMethods()` in
> [`live/liveApi.js`](src/booking/live/liveApi.js) (`jazzcash`, `easypaisa`, `card`). Keep this in line with the backend's `SAFEPAY_METHODS`.

---

## 6. Admin panel

`/admin` (live mode only, English). Sign in with a staff account; customers see "No access". Staff accounts also get an
**Admin** button in the site header. The code is a separate bundle loaded only when `/admin` is opened.

| Menu | Who | What it does |
|---|---|---|
| Dashboard | admin | Today's bookings, seats, money taken, cancellations, departures, refunds waiting |
| Trips & boarding | agent, admin | Departures by day; change status (boarding / delayed / departed / arrived / cancelled); passenger list with **Board** buttons and print; change bus and crew; add a one-off trip |
| Bookings | agent, admin | Search by reference / phone / status; passengers and payments; **Cash received** for held bookings; cancel (shows the refund first) |
| Refunds | admin | Approve, send the money, then **Mark paid** (with reference); or reject |
| Routes & stops | admin | Create routes, edit their ordered stops (only before they have bookings), rename, switch off |
| Fares | admin | Fares per stop pair and bus class; lists stop pairs with **no fare** (not bookable) with one-click "set fare" |
| Schedules & trips | admin | Regular departures (time, days, default bus) and **Create trips** for a date range (up to 92 days) |
| Buses, Drivers | admin | Fleet and drivers (expired licences can't be assigned); seat layouts shown read-only |
| Cities & terminals | admin | Places used by booking search and routes |
| Promo codes, Refund rules | admin | Discount codes; refund % by hours before departure (with a plain-words preview) |
| Users & staff | admin | Find accounts, change roles (admin roles: super admin only), block / unblock |
| Reports, Activity log | admin | Revenue and bookings by date range; who changed what |
| Website content | admin | Edit the text visitors read (see below) |

**Counter sales:** staff book a walk-in customer through the normal website booking flow while signed in; the payment page
then shows a staff-only **Cash received** button that confirms the booking immediately.

**Website content:** contact details, Terminals page, destinations (info-page fares and times), Multan route towns, coach classes,
promises, FAQ, Our journey, team, cargo note and all policies can be edited in forms (English and Urdu side by side, lists with
add / remove / reorder). Saving stores the section on the server; visitors get it on their next page load (about a minute of
caching). "Reset to built-in" goes back to the text in `src/data/`. How it works: `src/lib/content.js` fetches `GET /content`
before the app loads, and `applySiteContent()` / `applyLegalContent()` replace the built-in values. It waits at most 2.5 s, then
falls back to the copy this browser saved last time, then to the built-in text.

---

## 7. Languages (English / Urdu)

- Every visitor-facing string exists in both languages: `{ en: "...", ur: "..." }`.
  - Booking screens: [`src/booking/strings.js`](src/booking/strings.js), used as `bt("key", lang)` (supports `{placeholders}`).
  - General UI: [`src/lib/i18n.js`](src/lib/i18n.js), used as `u("key", lang)`.
  - Inline: `xt(lang, "English", "اردو")` (from `components/parts.jsx`).
- Urdu pages set `dir="rtl"`; numbers, references, phone numbers use the `ltr` class so they read correctly.
- First visit shows a language chooser; the choice is remembered in `localStorage` (`nk_lang_choice`).
- **When adding text, always add the Urdu version too.**

---

## 8. Styling

- Tailwind CSS 4 utility classes in JSX, plus custom classes in [`src/index.css`](src/index.css):
  - `pk-*`: Pakka design layer (paper & ink, 2px outlines, 4px offset shadow): header, nav, buttons (`pk-btn`, `pk-btn-ink`).
  - `card`, `btn`, `btn-gold`, `btn-ghost`, `h1`–`h3`, `label`, `field`: shared components used by the booking screens.
- The header switches to the hamburger menu below 1100px wide; the mobile sticky bar (Book / WhatsApp / Call) shows below 1024px.

---

## 9. Building and hosting

```bash
npm run build      # → dist/
```

The site is a **single-page app**: there is one `index.html`, so the web server must answer every address (e.g.
`/ur/book/my-bookings`) with `index.html`.

- **Apache / Hostinger shared hosting:** `public/.htaccess` (already set up) is copied into `dist/`. Upload **everything in
  `dist/` including the hidden `.htaccess`** to the web root (`public_html`).
- **Nginx:** `try_files $uri $uri/ /index.html;`
- **Other static hosts:** add a "fallback to index.html" / SPA rewrite rule.

After deploying, make sure the backend's `APP_URL` is this site's address (Safepay sends customers back to it) and the
site's address is in the backend's `CORS_ORIGINS`.

---

## 10. Common changes: where to edit

| I want to change… | Edit |
|---|---|
| Phone number, email, address, helpline hours | **Admin → Website content → Contact details** (built-in default: `src/data/site.js`) |
| Fares / timetable / terminal info on the info pages | **Admin → Website content** (booking prices: **Admin → Fares**) |
| Refund / privacy / terms text | **Admin → Website content → Policies** (built-in default: `src/data/legal.js`) |
| Header / menu links | `src/components/Chrome.jsx` (`MAIN`, `SERVICES`, `MORE`) |
| Booking screen wording | `src/booking/strings.js` |
| Status tag colours, booking cards | `src/booking/BookingList.jsx` |
| What My bookings shows / the expired pop-up | `src/booking/MyBookings.jsx` |
| Images | `public/images/` (webp) |
| Backend address | `.env` → `VITE_API_URL`, then rebuild |

---

## 11. Known limitations

- Fares, timings and most terminal addresses on the **information pages** are placeholders (the live site has the same
  amber notice). Live booking prices come from the database.
- Tickets and parcel receipts are printed with the browser's print (works in Urdu); there is no PDF download.
- Cargo/Charter forms need `VITE_WEB3FORMS_KEY` to send by email; otherwise they open WhatsApp.
- Admin panel is English only and needs live mode. It can't create seat layouts or upload images (enter an image path or link).
- Information-page fares/times (website content) and booking prices (Fares) are separate; keep them in line.
- No automated tests.
- Differences from the original live site: each passenger's **gender** comes from their seat (used for the side-by-side seat rule), route map
  "Book" links pre-fill the search, Sign in / Sign out in the header (live mode).
