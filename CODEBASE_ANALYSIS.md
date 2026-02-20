# Codebase Analysis — Where in the World are Terry and Dana?

_Last updated: 2026-02-20_

---

## 1. What This App Is

A full-stack travel tracking website for Terry and Dana. Visitors can see where they are right now, where they've been, and where they're headed next. An admin dashboard lets you manage trip data, users, and view visitor analytics. Google Sheets serves as the database for everything.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.4.5 (App Router) |
| UI | React 19.1.0 + Tailwind CSS 4 |
| Animations | Framer Motion |
| Map | D3.js (d3-geo, d3-selection, d3-zoom) + TopoJSON |
| Auth | NextAuth.js v4.24.13 |
| Database | Google Sheets (via `google-spreadsheet` SDK) |
| Auth service | Google Service Account (JWT) |
| Password hashing | bcryptjs |
| Deployment | AWS Amplify (amplify.yml present) |
| Language | TypeScript 5 |

---

## 3. Architecture Overview

### Directory Structure

```
/
├── app/
│   ├── admin/          # Admin dashboard (visitors, users, debug)
│   ├── api/            # API routes (travel-data, auth, users, visitors, track-visitor, debug)
│   ├── auth/signin/    # Sign-in page
│   ├── map/            # Interactive map page
│   ├── pictures/       # Protected photo gallery
│   ├── profile/        # Protected user profile
│   ├── types/          # Core TypeScript types (TravelData, User)
│   ├── App.tsx         # Root app component (orchestrates data + layout)
│   ├── layout.tsx      # Root layout (wraps providers)
│   └── page.tsx        # Entry point (renders App.tsx)
├── components/         # Reusable UI components
├── hooks/
│   └── useTravelData.ts
├── lib/
│   └── google-sheets.ts  # All DB operations
├── public/
│   └── travel-data.json  # Fallback static data
├── middleware.ts         # Route protection
└── types/
    └── next-auth.d.ts    # NextAuth type extensions
```

### Data Flow

```
Browser
  → App.tsx (client component)
    → useTravelData() hook
      → GET /api/travel-data
        → lib/google-sheets.ts:fetchTravelData()
          → Google Sheets API (service account auth)
```

### Authentication Flow

```
User → /auth/signin → NextAuth credentials provider
  → lib/google-sheets.ts:getUserByEmail()
  → bcrypt.compare(password, hash)
  → JWT session with role (admin | user | guest)
  → middleware.ts enforces session on /pictures, /profile, /admin
```

### Google Sheets Schema

Three sheets in the same spreadsheet:

| Sheet | Columns |
|---|---|
| (main, by ID) | location, country, travelTimeToHere, timeZone, arrivalDate, departureDate, daysAtPlace, residing, booked, vacationStart, vacationEnd, lat, lon |
| Visitors | timestamp, ip, userAgent, path, referrer, city, country |
| Users | id, name, email, password, role, createdAt, updatedAt |

### Route Protection

`middleware.ts` protects three path prefixes via NextAuth session check:
- `/pictures/*`
- `/profile/*`
- `/admin/*`

### Trip Categorization Logic (`app/types/Travel-data.ts`)

`organizeTravelData()` sorts all trips into four buckets based on today's date relative to `arrivalDate`/`departureDate`:

1. **currentLocation** — arrival ≤ today ≤ departure
2. **alreadyTraveled** — departure < today (sorted newest first)
3. **upcomingTrips** — arrival > today AND `booked === true`
4. **potentialTrips** — arrival > today AND `booked === false`

---

## 4. Feature Inventory

### Public-facing
- **Home page** — hero section with current location, stats (countries, destinations, days, upcoming)
- **Travel timeline** — chronological list of past, current, and future trips
- **Location cards** — details per destination
- **Interactive world map** — D3/TopoJSON map with zoom/pan, trip locations plotted
- **Weather indicator** — weather display per location
- **Skeleton loading screens** — prevents layout shift during data fetch

### Protected (authenticated users)
- **Photo gallery** (`/pictures`) — requires login
- **Profile page** (`/profile`) — requires login

### Admin only (`/admin`)
- **Visitor dashboard** — list of all site visitors with geo-data
- **User management** — create, view, update users
- **Debug page** — environment/config inspection

### Infrastructure
- **Visitor tracking** — `POST /api/track-visitor` on every page load; deduped within session via `sessionStorage`; stores IP, UA, path, referrer, geo from Vercel edge geo headers
- **Retry logic** — exponential backoff on both client (hook) and server (sheets lib) for transient Google API failures
- **Fallback data** — `public/travel-data.json` used when `source: "local"` in the hook

---

## 5. Known Issues & Tech Debt

### High Priority

**1. Retry logic is doubled up**
`useTravelData.ts` retries the fetch up to 3 times client-side. `lib/google-sheets.ts:fetchTravelData()` also retries up to 3 times server-side. A single transient failure can result in up to 9 total attempts (3 client retries × 3 server retries each). The server-side retry in the lib is the safer place; the client-side retry in the hook is redundant given the API already retries.

**2. Passwords stored in Google Sheets**
User passwords (bcrypt-hashed) live in a column in a Google Sheet. This means anyone with Sheets access (the service account, anyone you share the sheet with) can see hashed passwords. For a personal/small app this may be acceptable, but it's a significant departure from normal credential storage practices.

**3. `(request as any).geo` type cast — visitor geo may always be empty**
In `app/api/track-visitor/route.ts:18`, geo data is accessed via `(request as any).geo`. This pattern is specific to Vercel's edge runtime. On AWS Amplify (which this app is deployed to), `request.geo` will be `undefined`, meaning city/country will always be blank in visitor logs.

### Medium Priority

**4. Leftover debug/simulation comments in production code**
`lib/google-sheets.ts` lines 40–55 contain a large commented-out block that was a draft plan for simulating retry failures during development. It's dead weight and makes the file harder to read.

**5. `console.log` statements throughout**
Numerous `console.log` calls exist in `google-sheets.ts` that will appear in production server logs (e.g., `"Doc loaded: ..."`, `"Sheet found: ..."`, `"Found N rows"`). These should either be removed or gated behind a `DEBUG` env flag.

**6. `getVisitors()` loads unbounded rows**
There's a TODO comment in `google-sheets.ts:177` noting that the visitors list should be limited to the last 1000 rows for performance. As traffic grows, this will get slow.

**7. `getUserByEmail()` is a full table scan**
`getUserByEmail()` calls `getUsers()` (which fetches all rows) and then filters in memory. For a small user base this is fine, but it's an inefficient pattern if the Users sheet ever grows.

**8. `useTravelData` source option has a hardcoded placeholder**
The hook accepts `source: "s3"` and constructs a URL to `my-travel-data-bucket.s3.us-east-1.amazonaws.com` — a placeholder that was never replaced with a real bucket. If anyone calls the hook with `source: "s3"` it will fail silently.

### Low Priority

**9. NextAuth v4 + React 19 compatibility**
NextAuth v4 was designed for React 18. React 19 changed some internal behaviors. While it likely works, this is an untested combination that could surface subtle issues. NextAuth v5 (Auth.js) has first-class React 19 support.

**10. Non-standard App Router pattern**
The App Router convention is `app/page.tsx` as the leaf component. This project has `app/page.tsx` render `app/App.tsx`, which is an extra indirection that doesn't follow standard Next.js App Router conventions. Minor, but adds confusion.

**11. `finally` block dead comment in `useTravelData`**
Lines 86–89 in `useTravelData.ts` have a comment block inside `finally` that explains why the code in `finally` isn't there — i.e., it's a comment explaining nothing is done. The block should just be removed.

**12. No tests**
There are no test files anywhere in the project. No unit tests for utility functions (`organizeTravelData`, `calculateStats`, `parseBoolean`), no integration tests for API routes.

---

## 6. Future Recommendations

### Near-term (low effort, high value)

- **Remove leftover debug comments** in `google-sheets.ts` (the simulation block)
- **Remove or gate `console.log` calls** behind an env var
- **Fix visitor geo-tracking** for the actual deployment target (AWS Amplify doesn't provide `request.geo`; you'd need a third-party IP geo service like `ipapi.co`)
- **Cap `getVisitors()` to last N rows** — just reverse the rows before slicing

### Medium-term

- **Pick one retry layer** — keep server-side retry in `google-sheets.ts` and remove the retry loop from `useTravelData.ts`. Simpler, and server errors should be the source of truth on retries.
- **Add basic unit tests** for `organizeTravelData()`, `calculateStats()`, and `parseBoolean()` — these are pure functions with clear inputs/outputs, easy wins.
- **Replace the `source: "s3"` option** — either implement it with a real bucket URL (env var) or remove the dead code path.

### Longer-term

- **Migrate from NextAuth v4 to Auth.js (v5)** — better React 19/Next.js App Router alignment, improved TypeScript types, edge runtime support
- **Add pagination or a date-range filter to the visitor dashboard** — the full visitor list will become unwieldy
- **Consider a lightweight real DB** — if the site grows, Google Sheets as a database will hit rate limits and performance walls. PlanetScale, Turso, or even a simple SQLite file via Cloudflare D1 would be a significant upgrade with minimal schema changes.
- **Add a `robots.txt` and `sitemap.xml`** — if SEO matters for the public-facing pages

---

## 7. Environment Variables Required

```
GOOGLE_SHEET_ID                # Spreadsheet ID from the URL
GOOGLE_SHEET_TAB_ID            # Numeric sheet tab ID (default: 0)
GOOGLE_SERVICE_ACCOUNT_EMAIL   # Service account email
GOOGLE_PRIVATE_KEY             # Service account private key (with \n escaped)
NEXTAUTH_SECRET                # Random secret for JWT signing
NEXTAUTH_URL                   # Full URL of the deployed app
```

See `env.example` for the full template.

---

## 8. Deployment Notes

- Deployment target: **AWS Amplify** (see `amplify.yml`)
- Visitor geo-tracking uses Vercel-specific headers — **does not work on Amplify** as-is
- `NEXTAUTH_URL` must match the actual deployed URL exactly for auth redirects to work
- Google service account needs read/write access to the spreadsheet
