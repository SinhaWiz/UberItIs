# Web UI

React + TypeScript front end for the Uber microservices project. Every request
goes through the **API Gateway on `:8080`** — services are never called
directly, so the gateway can route and validate JWTs.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts: `npm run build` (type-check + production build), `npm run preview`,
`npm run lint`.

To point at a gateway somewhere other than `http://localhost:8080`, copy
`.env.example` to `.env` and set `VITE_API_BASE_URL`.

### Backend prerequisites

Start these before the UI, in this order:

1. RabbitMQ — `docker compose up -d` from the repo root
2. `eureka-server` (:8761)
3. `api-gateway` (:8080) — wait ~30s for it to pull the Eureka registry
4. `user-service` (:8081), `driver-service` (:8083), `ride-service` (:8082)

The gateway allows `http://localhost:5173` via `CorsConfig`. If you run the dev
server on a different port, add that origin there too, or the browser will
block every request.

## Structure

```
src/
├── auth/          AuthContext (token + user in localStorage) and route guards
├── components/    Design system and shared UI
├── hooks/         React Query hooks, one per backend resource
├── lib/           API client, formatting, error mapping, ride helpers
├── pages/         Screens grouped by area: auth, rider, driver, admin
└── index.css      Design tokens and Tailwind theme
```

### Design system

Semantic colours are CSS variables on `:root` that flip with
`prefers-color-scheme`, mapped into Tailwind via `@theme inline`. Utilities like
`bg-canvas` and `text-ink` therefore adapt to dark mode on their own, and no
component needs `dark:` variants. Saturated colour is reserved almost entirely
for ride status.

## Things worth knowing

- **Everything live is polled.** The backend has no WebSocket, so the rider's
  active ride refreshes every 4s, the driver dashboard every 5s and the admin
  tables every 10s. Polling stops once a ride reaches a terminal status.
- **Drivers have no incoming-request inbox.** Matching is triggered by the
  rider and the backend picks the first available driver, so the driver
  dashboard discovers work by polling its own ride list. There is no
  accept/reject step, because no endpoint exists for one.
- **Driver signup is two steps** — the account lives in user-service and the
  vehicle profile in driver-service, and a driver isn't matchable until both
  exist.
- **Fares are placeholders.** `payment-service` isn't implemented, so the fare
  is a flat estimate and is shown read-only.
- **Admin stats are derived client-side** from the users and active-rides
  lists; there is no statistics endpoint, and no endpoint returns all rides.
