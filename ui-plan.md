# UI Implementation Plan — Uber Microservices

## Context

The backend is functionally complete for the core ride lifecycle: `user-service` (auth + profiles), `driver-service` (vehicle profiles, availability, location), `ride-service` (full request → match → start → complete/cancel lifecycle), `payment-service` (fare calculation, Stripe-backed processing), `notification-service` (consumes `ride.status.changed`/`payment.completed`, exposes read/unread/mark-as-read), plus `eureka-server` and `api-gateway`.

There is **no frontend code in the repository today**. This plan covers building one from scratch, phase by phase.

The UI talks to **only one origin — the API Gateway on `:8080`**. It never calls services directly. The gateway handles routing (`/api/users/**`, `/api/rides/**`, `/api/drivers/**`) and enforces JWT auth on everything except `/api/users/register` and `/api/users/login`.

---

## Design Direction

**Clean, simplistic, elegant.** The visual language is restrained and typographic rather than decorative — near-monochrome with a single accent, generous whitespace, and colour reserved almost entirely for conveying ride state. Mobile-first, because ride-hailing is a phone experience; the admin console is the one desktop-first surface.

### Design tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` / dark `#0B0B0C` | Page background |
| `--surface` | `#FAFAFA` / dark `#141416` | Cards, sheets |
| `--border` | `#E8E8EA` / dark `#26262A` | Hairlines, dividers |
| `--text` | `#111113` / dark `#F5F5F7` | Primary text |
| `--text-muted` | `#71717A` | Labels, timestamps, helper text |
| `--primary` | `#111113` / dark `#F5F5F7` | Primary buttons (near-black, Uber-like) |
| `--accent` | `#2563EB` | Links, focus rings, active nav |

**Status colours** (the only place saturated colour appears — one per `RideStatus`):

| Status | Colour | Meaning |
|---|---|---|
| `REQUESTED` | Amber `#D97706` | Waiting for a driver |
| `MATCHED` | Blue `#2563EB` | Driver assigned, en route |
| `IN_PROGRESS` | Violet `#7C3AED` | Trip underway |
| `COMPLETED` | Green `#16A34A` | Terminal, success |
| `CANCELLED` | Grey `#71717A` | Terminal, neutral |

**Type:** Inter (or system stack). Scale: `12 / 14 / 16 / 20 / 24 / 32`. Weights 400 / 500 / 600 only.
**Spacing:** 4px base — `4 / 8 / 12 / 16 / 24 / 32 / 48`.
**Radius:** `8px` controls, `12px` cards, `999px` pills.
**Elevation:** one soft shadow for raised cards; no heavy shadows.
**Motion:** 150–200ms ease-out. Status changes animate; nothing else needs to.

### Recommended stack

**React 18 + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query.**

Rationale: Vite gives instant dev startup; Tailwind enforces the token system without a CSS architecture debate; TanStack Query matters specifically because **ride status must be polled** (see Constraints) and it handles polling, caching, and loading/error states declaratively instead of hand-rolled `useEffect` + `setInterval` in every screen.

Lives in a new top-level **`web/`** directory. It is **not** a Maven module — do not add it to the root `pom.xml`'s `<modules>`.

> If the team prefers to avoid a build step entirely, plain HTML + vanilla JS against the same gateway endpoints is viable, but polling, route guards, and shared state become notably more manual. The phases below assume the React stack.

---

## Constraints & API Gaps (read before planning sprints)

These are real limits of the current backend that directly shape what the UI can and cannot do.

| # | Constraint | UI consequence |
|---|---|---|
| 1 | **No CORS config on the gateway**, and `AuthenticationFilter` (order `-1`) rejects preflight `OPTIONS` (no auth header) with 401 | **Hard blocker.** Backend fix required first — this is Phase 0 |
| 2 | **No WebSocket / push** anywhere | All live updates are **polling**. Rider polls their active ride; driver polls for assigned rides |
| 3 | **No driver "incoming request" endpoint.** `PUT /api/rides/{id}/match` is rider-triggered and auto-picks the first available driver | Driver cannot accept/reject (report UC-D06/D07 is unbuildable as specified). Driver discovers assigned rides by polling `GET /api/rides/driver/{driverId}` and filtering for `MATCHED`/`IN_PROGRESS` |
| 4 | **No map / geocoding service.** `pickupLocation` / `dropoffLocation` are free-text strings | Text inputs, not a map picker. `RideRequest` does accept optional `pickupLat`/`pickupLng`, so a coordinate field is possible, but there is no map provider to render |
| 5 | `payment-service` is now implemented (fare calculation, Stripe-backed processing) | Payment method / checkout UI is buildable — no longer blocked |
| 6 | `notification-service` is now implemented. `GET /api/notifications/user/{userId}` (+ `/unread`, `PUT /{id}/read`) respond | Notification centre is buildable — no longer blocked |
| 7 | **No admin statistics endpoint** | Admin stats derived client-side from `GET /api/users` and `GET /api/rides/active` |
| 8 | **JWT expires in 24h**; claims are `sub` = userId, `role` = RIDER/DRIVER/ADMIN | Store token + decode role for guards; handle 401 by redirecting to login |
| 9 | **Driver onboarding is two steps** — register user (`role: DRIVER`), *then* create a driver profile with vehicle details | Driver signup is a 2-step wizard, not one form |

---

## Phase 0 — Backend Enablers (blocker, must ship first)

**Goal:** Make the gateway reachable from a browser. No UI work can be verified until this is done.

- **Add CORS to `api-gateway`** — allow the Vite dev origin (`http://localhost:5173`), methods `GET/POST/PUT/OPTIONS`, headers `Authorization, Content-Type`. In Spring Cloud Gateway 2025 this is `spring.cloud.gateway.server.webflux.globalcors.cors-configurations` (note the `server.webflux` prefix — the same breaking change already documented in `AGENTS.md` §4.1), with `add-to-simple-url-handler-mapping: true` so preflight is handled.
- **Let preflight bypass auth** — `AuthenticationFilter` must short-circuit `OPTIONS` requests before the token check, e.g. return `chain.filter(exchange)` immediately when `request.getMethod() == HttpMethod.OPTIONS`. Without this, order `-1` guarantees every preflight 401s regardless of CORS config.
- **Verify** with a raw preflight against a secured route:
  `curl -i -X OPTIONS http://localhost:8080/api/rides/active -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"` → expect `200/204` with `Access-Control-Allow-Origin`, **not** `401`.

**Done when:** a browser `fetch` from a page on `:5173` to a secured gateway route succeeds with a valid token and is not blocked by CORS.

---

## Phase 1 — Scaffold & Design System

**Goal:** A running shell with the visual language encoded, before any feature screens exist.

- Scaffold `web/` — Vite + React + TS; Tailwind configured with the tokens above (colours, spacing, radius, font scale) so they're used by name, never hard-coded hex.
- **API client** (`src/lib/api.ts`) — single `fetch` wrapper: base URL `http://localhost:8080` from `VITE_API_BASE_URL`, auto-attaches `Authorization: Bearer <token>`, parses the backend's flat error shape `{timestamp, status, error, message}`, throws a typed `ApiError`, and triggers logout on 401.
- **TypeScript types mirroring backend DTOs** — `User`, `Role`, `Ride`, `RideStatus`, `DriverProfile`, request/response shapes. Single source of truth for the whole app.
- **Base components:** `Button` (primary/secondary/ghost/danger), `Input`, `Select`, `Card`, `StatusPill`, `Spinner`, `Skeleton`, `EmptyState`, `Toast`, `Modal`, `AppShell` (header + role-aware nav).
- **Layout:** mobile-first, content max-width ~480px for rider/driver flows, wide for admin.

**Done when:** a component gallery route renders every base component in light and dark, and no screen-level code exists yet.

---

## Phase 2 — Auth & Routing

**Goal:** Users can register, log in, and land on the right home screen for their role.

- **Screens:** Login, Register (role selector: Rider / Driver), plus a "create your vehicle profile" step shown only to drivers immediately after registration (see Constraint 9).
- **Auth context** — holds `{token, user}`, persisted to `localStorage`, hydrated on boot. `login()` calls `POST /api/users/login` → stores `token` + `user` from `LoginResponse`.
- **Route guards** — `<RequireAuth>` and `<RequireRole role="...">`. Unauthenticated → `/login`. Wrong role → that role's home.
- **Role-based landing:** `RIDER` → `/ride`, `DRIVER` → `/drive`, `ADMIN` → `/admin`.
- **401 handling** — any 401 from the API client clears auth and redirects to login (covers the 24h expiry).

**API:** `POST /api/users/register`, `POST /api/users/login`, `POST /api/drivers/profile`.

**Done when:** all three roles can register, log in, refresh the page without losing session, and log out.

---

## Phase 3 — Rider Core Flow

**Goal:** The primary product loop — request a ride and watch it through to completion.

- **Request Ride** — pickup + dropoff text inputs, optional lat/lng, submit → `POST /api/rides/request`. Shows the returned `fareEstimate` before/after submit. Empty state when the rider has no active ride.
- **Active Ride** — the centrepiece screen:
  - A **vertical status timeline** (Requested → Matched → In progress → Completed) with the current step accented and prior steps subdued; the single strongest visual moment in the app.
  - `StatusPill` for current `RideStatus`, timestamps from `requestedAt` / `matchedAt` / `startedAt` / `completedAt`.
  - Driver card once `driverId` is set — fetched via `GET /api/drivers/{driverId}` for vehicle model/plate/colour, and `GET /api/users/{driverId}` for name/phone.
  - **Polls `GET /api/rides/{id}` every ~4s** while status is non-terminal; stops polling on `COMPLETED`/`CANCELLED` (Constraint 2).
  - **Cancel** button (with confirm modal) → `PUT /api/rides/{id}/cancel`, hidden once terminal.
  - Note: a driver is only assigned when `PUT /api/rides/{id}/match` is called. Decide whether the rider UI calls match automatically right after request (smoother, matches the report's Flow 1 sequence) or exposes a "Find a driver" button. **Recommend auto-calling match immediately after a successful request**, with the 404 "No available drivers found" surfaced as a friendly retry state.
- **Fare** shown read-only; `finalFare` appears on completion (Constraint 5).

**API:** `POST /api/rides/request`, `PUT /api/rides/{id}/match`, `GET /api/rides/{id}`, `PUT /api/rides/{id}/cancel`, `GET /api/drivers/{userId}`, `GET /api/users/{id}`.

**Done when:** a rider completes the full lifecycle end-to-end in the browser, with status updating live via polling, against a real driver profile.

---

## Phase 4 — Driver Core Flow

**Goal:** A driver can go online, be matched, and drive the trip to completion.

- **Driver Dashboard**
  - **Availability toggle** (online/offline) → `PUT /api/drivers/{userId}/availability`. Prominent, unmistakable state — this is the driver's most-used control.
  - **Location update** — lat/lng fields with a "use my location" button backed by the browser Geolocation API → `PUT /api/drivers/{userId}/location`.
  - Vehicle summary card from `GET /api/drivers/{userId}`.
- **Assigned Ride** — since there is no push and no accept/reject endpoint (Constraint 3), the dashboard **polls `GET /api/rides/driver/{driverId}` every ~5s** and surfaces any ride in `MATCHED` or `IN_PROGRESS`.
  - `MATCHED` → primary action **Start ride** → `PUT /api/rides/{id}/start`.
  - `IN_PROGRESS` → primary action **Complete ride** → `PUT /api/rides/{id}/complete`.
  - Rider details via `GET /api/users/{riderId}`; pickup/dropoff shown plainly.
  - Single dominant action button per state — no ambiguity about what to tap next.

**API:** `GET /api/drivers/{userId}`, `PUT /api/drivers/{userId}/availability`, `PUT /api/drivers/{userId}/location`, `GET /api/rides/driver/{driverId}`, `PUT /api/rides/{id}/start`, `PUT /api/rides/{id}/complete`, `GET /api/users/{id}`.

**Done when:** with two browser sessions (rider + driver), a ride flows request → match → start → complete, each side reflecting the other's actions within one poll interval.

---

## Phase 5 — History & Profile

**Goal:** Round out both personas with the supporting screens.

- **Ride History** — rider: `GET /api/rides/rider/{riderId}`; driver: `GET /api/rides/driver/{driverId}`. Reverse-chronological cards: route, date, status pill, fare. Filter by status. Tap → read-only ride detail reusing the Phase 3 timeline.
- **Driver earnings summary** — client-side sum of `finalFare` across `COMPLETED` rides (no payment service; label it as trip totals, not settled earnings).
- **Profile** — view/edit name, phone via `PUT /api/users/{id}`. Drivers additionally edit vehicle fields via `PUT /api/drivers/{userId}`.
- Note `PUT /api/users/{id}` accepts a `RegisterRequest`, so send only the fields being changed; email/password changes are intentionally unsupported by the backend.

**Done when:** both personas can review past rides and edit their own details.

---

## Phase 6 — Admin Console

**Goal:** The desktop-first oversight surface.

- **Users** — `GET /api/users`, with role filter via `GET /api/users/role/{role}`. Sortable table, role badges.
- **Active Rides** — `GET /api/rides/active`, polled every ~10s. Table with status pill, rider, driver, route, elapsed time.
- **Stats** — computed client-side (Constraint 7): total users by role, count of active rides by status, completed-ride count and fare total. A compact row of stat tiles, not a chart-heavy dashboard.
- Table-dense layout, wider container, but the same tokens and restraint.

**Done when:** an admin can see every user and monitor live rides without touching an HTTP client.

---

## Phase 7 — Polish

**Goal:** Make it feel finished.

- Loading skeletons on every async surface; no layout shift.
- Empty states with a clear next action ("No rides yet — request one").
- Error states mapped from the backend's `{status, message}` shape — 404/409 rendered as human sentences (e.g. `InvalidStateException` on a stale tab → "This ride has already been started").
- Toasts for every successful mutation.
- Full responsive pass; dark mode verified against every token.
- Accessibility: focus rings, labelled inputs, keyboard-navigable modals, `aria-live` on the ride status timeline so status changes are announced.
- Micro-interactions limited to status transitions and button feedback.

**Done when:** every screen has defined loading, empty, and error states, and the app is keyboard-navigable.

---

## Phase 8 — Deferred (blocked on backend)

Not buildable until the corresponding services exist. Listed so scope is explicit rather than forgotten.

| Feature | Blocked on | Notes |
|---|---|---|
| Payment / checkout UI | `payment-service` — **backend ready** | `payment-service` is implemented; this is now a frontend-only build, not backend-blocked |
| Notification centre | `notification-service` — **backend ready** | `notification-service` is implemented (`GET /api/notifications/user/{userId}` + unread/read endpoints); would replace polling with a real feed. Now a frontend-only build |
| Driver accept/reject | New ride-service endpoint | Requires a pending-requests endpoint per Constraint 3 before UC-D06/D07 can be built |
| Map view / live tracking | Location service or map provider | Report explicitly scopes real-time GPS out |

---

## Phase Summary

| Phase | Scope | Blocking? |
|---|---|---|
| 0 | Gateway CORS + preflight bypass | **Yes — blocks everything** |
| 1 | Scaffold, tokens, base components | Blocks 2+ |
| 2 | Auth, routing, role guards | Blocks 3+ |
| 3 | Rider: request + live tracking | Core loop |
| 4 | Driver: availability + trip actions | Core loop |
| 5 | History + profiles | Independent |
| 6 | Admin console | Independent |
| 7 | Polish | Last |
| 8 | Payment / notifications / maps | Deferred |

Phases 5 and 6 are independent of each other and can run in parallel across team members once Phase 4 lands. Phases 0 → 1 → 2 → 3 → 4 are strictly sequential.
