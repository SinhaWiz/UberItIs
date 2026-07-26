# Ride Service — Implementation Plan

## Context

`ride-service` (port `8082`) is the last major skeleton left to implement (after `user-service` and `driver-service`, which are done). Per `docs/report.md` §5.3.2, it owns the core ride lifecycle: request → match → in-progress → completed/cancelled. It talks synchronously (REST via `RestTemplate`, load-balanced through Eureka) to `user-service` and `driver-service`, and publishes async events to RabbitMQ (`ride.status.changed`) for `notification-service` to consume. It also calls `payment-service` on completion — which is itself unimplemented, so that call must be a documented stub per `AGENTS.md` §2.3.

This plan follows the conventions already established by `driver-service` and `user-service`: package layout (`model`, `dto`, `repository`, `service`, `controller`, `exception`, `config`), Lombok-heavy entities/DTOs, `MongoRepository`, `RestControllerAdvice`-based error handling, DTO-only controller responses, `@LoadBalanced RestTemplate` for inter-service REST calls, and `@EnableMongoAuditing`.

**Pre-existing issue to fix first:** `ride-service/pom.xml` and `RideServiceApplication.java` are currently broken/stale (untracked local edits point the POM at a nonexistent parent `com.nas:sport-micro` with Java 17, strip all dependencies and the Spring Boot plugin, and duplicate imports in the Application class). Subplan 0 resets these to match the working pattern from `driver-service`/root `pom.xml` before any feature code is written.

**Gateway routing is already wired:** `api-gateway/src/main/resources/application.yml` already has a route `Path=/api/rides/** → lb://RIDE-SERVICE` — no gateway changes are needed. The gateway's global `AuthenticationFilter` validates a JWT on every request except `/api/users/register` and `/api/users/login`, injecting `X-Auth-User-Id`/`X-Auth-User-Role` headers downstream. Ride-service doesn't need to verify these itself (same trust posture as driver-service — no `SecurityConfig`), but the `.http` test files in Subplan 8 must obtain a JWT via login first when testing through the gateway (direct-port tests in `requests/ride.http` bypass this since they hit `localhost:8082` directly).

Each subplan below is a self-contained unit of work, done in order. Subplans 1–7 mirror the implementation order in `AGENTS.md` §2.1.

---

## Subplan 0 — Fix Skeleton (POM + Application class)

**Goal:** Get `ride-service` back to a buildable baseline consistent with the other services.

- Rewrite `ride-service/pom.xml`:
  - Parent: `org.uber:sda_project:1.0-SNAPSHOT` (`../pom.xml`), matching `driver-service/pom.xml`.
  - `artifactId`: `ride-service` (no explicit `<version>`/`<properties>`/`<name>`/`<description>` — inherit from parent, matching driver-service's minimal style).
  - Dependencies (no `<version>` tags — managed by root POM / Spring Boot BOM):
    - `spring-boot-starter-web`
    - `spring-boot-starter-data-mongodb`
    - `spring-cloud-starter-netflix-eureka-client`
    - `spring-cloud-starter-loadbalancer` (required for `@LoadBalanced RestTemplate` per `AGENTS.md` §4.7)
    - `spring-boot-starter-amqp` (RabbitMQ, since ride-service publishes events)
    - `lombok` (optional)
  - `<build>` block with `spring-boot-maven-plugin`.
- Fix `RideServiceApplication.java`: remove the duplicate `import` block, keep a plain `@SpringBootApplication` class (no extra annotations needed — Eureka client auto-registers via dependency + config, same as driver-service).
- Sanity-check `ride-service/mvnw` / `mvnw.cmd` are untouched/harmless (currently untracked — leave as-is unless they conflict with root wrapper; likely fine to `git add` alongside the rest at the end, or remove if the root project doesn't use per-module wrappers elsewhere).
- Verify: `mvn clean compile -pl ride-service` (or full `mvn clean compile`) succeeds with just the skeleton.

---

## Subplan 1 — Model Layer

**Goal:** Define the `Ride` entity and `RideStatus` enum matching `docs/report.md` §5.3.2's data model.

- `model/RideStatus.java` — enum: `REQUESTED, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED`.
- `model/Ride.java` — `@Document(collection = "rides")`, `@Data @Builder @NoArgsConstructor @AllArgsConstructor`, fields:
  - `id` (`@Id String`)
  - `riderId` (`String`, references User)
  - `driverId` (`String`, nullable until matched)
  - `pickupLocation` (`String`)
  - `dropoffLocation` (`String`)
  - `status` (`RideStatus`, `@Builder.Default` = `REQUESTED`)
  - `fareEstimate` (`Double`, `@Builder.Default` = `0.0`)
  - `finalFare` (`Double`, nullable until completed)
  - `requestedAt` (`LocalDateTime`, `@CreatedDate`)
  - `matchedAt`, `startedAt`, `completedAt` (`LocalDateTime`, set manually in service layer on status transitions — these are not blanket `@LastModifiedDate` since only one changes per transition)
  - `updatedAt` (`LocalDateTime`, `@LastModifiedDate`)
- Consider `@Indexed` on `riderId` and `driverId` for the history-lookup queries in Subplan 3.

---

## Subplan 2 — DTOs

**Goal:** Request/response separation, matching the `*Request`/`*Response` naming convention.

- `dto/RideRequest.java` — input for `POST /api/rides/request`: `riderId`, `pickupLocation`, `dropoffLocation`.
- `dto/RideResponse.java` — full output DTO mirroring `Ride` fields (id, riderId, driverId, pickupLocation, dropoffLocation, status, fareEstimate, finalFare, requestedAt, matchedAt, startedAt, completedAt).
- `dto/MatchDriverRequest.java` — input for `PUT /api/rides/{id}/match` (optional explicit `driverId`, or empty body if auto-matching nearest available driver — see Subplan 6 decision).
- Event DTO for RabbitMQ (used by Subplan 5 config + Subplan 6 service):
  - `dto/RideStatusChangedEvent.java` — `rideId`, `riderId`, `driverId`, `status`, `message`, `timestamp`. Matches report §7.3 payload (`rideId, riderId, driverId, status, message`).
- No DTO needed for start/complete/cancel — those are path-param-only mutations returning `RideResponse`.

---

## Subplan 3 — Repository

**Goal:** `MongoRepository` with the query methods the report's endpoint table implies.

- `repository/RideRepository.java` extends `MongoRepository<Ride, String>`:
  - `List<Ride> findByRiderId(String riderId)` — ride history for a rider.
  - `List<Ride> findByDriverId(String driverId)` — ride history for a driver.
  - `List<Ride> findByStatusIn(List<RideStatus> statuses)` — backs `GET /api/rides/active` (active = `MATCHED` or `IN_PROGRESS`, per report status enum; `REQUESTED` arguably also "active" — decide in service layer, see Subplan 6).

---

## Subplan 4 — Exceptions

**Goal:** Reuse the identical pattern from `driver-service`/`user-service` (near-verbatim copy, same messages style).

- `exception/ResourceNotFoundException.java` — 404 (ride not found, or rider/driver validation failure).
- `exception/DuplicateResourceException.java` — 409 (kept for parity even if unused initially; e.g. could guard against a rider having more than one active ride, if that rule is adopted — see Subplan 6 open question).
- `exception/InvalidStateException.java` — **new**, not present in other services: needed for illegal status transitions (e.g. completing a `REQUESTED` ride, matching an already-`MATCHED` ride). Maps to 400 or 409 — recommend 409 Conflict since it's a state conflict, handled alongside `IllegalArgumentException`'s 400 slot, or as its own handler.
- `exception/GlobalExceptionHandler.java` — `@RestControllerAdvice`, same JSON error shape (`timestamp`, `status`, `error`, `message`) as the other two services, with handlers for `ResourceNotFoundException` (404), `DuplicateResourceException` (409), `InvalidStateException` (409), `IllegalArgumentException` (400).

---

## Subplan 5 — Config

**Goal:** Beans for inter-service REST calls, Mongo auditing, and RabbitMQ topology.

- `config/AppConfig.java` — `@LoadBalanced RestTemplate` bean (identical to driver-service's).
- `config/MongoConfig.java` — `@EnableMongoAuditing` (identical to driver-service's).
- `config/RabbitMQConfig.java` — **new pattern for this service**. Declares, per report §7.4:
  - Topic exchange bean: `uber.exchange`.
  - Queue bean: `ride.status.queue`.
  - Binding: routing key `ride.status.changed`.
  - `Jackson2JsonMessageConverter` bean so `RideStatusChangedEvent` serializes as JSON (not Java-serialized) for a future cross-language/cross-service consumer — this is the standard Spring AMQP convention and worth setting explicitly since `notification-service` isn't built yet and its exact deserialization needs aren't locked in.
- `application.yml` already has `spring.rabbitmq.*` configured (host/port/guest) — no changes needed there, just confirm it's reachable (RabbitMQ must be running locally per README prerequisites).

---

## Subplan 6 — Service Layer

**Goal:** Core business logic — the biggest and most architecturally significant subplan. One class, `service/RideService.java`, `@Service @RequiredArgsConstructor`, injecting `RideRepository`, `RestTemplate`, `RabbitTemplate`.

Methods, one per endpoint:

1. **`requestRide(RideRequest)`** → validates rider exists via `GET http://user-service/api/users/{riderId}` (same try/catch → `ResourceNotFoundException` pattern as driver-service's `validateUserExists`). Creates `Ride` with `status=REQUESTED`, `requestedAt=now`. Fare estimate: since there's no real distance/geocoding, compute a placeholder estimate — reuse payment-service's documented formula (`baseFare 50.0 + distance × 15.0`) with a stubbed/random or fixed distance, OR leave `fareEstimate` at a flat default and mark clearly as a stub pending Payment Service integration (**recommend the latter — cleaner, avoids duplicating pricing logic that belongs to payment-service**). Saves ride, publishes `ride.status.changed` (status=REQUESTED) event. Returns `RideResponse`.

2. **`getRide(id)`** → simple `findById` → `ResourceNotFoundException` if absent → map to response.

3. **`matchDriver(id, MatchDriverRequest)`** → loads ride, verifies `status == REQUESTED` (else `InvalidStateException`). Driver selection:
   - Calls `GET http://driver-service/api/drivers/available` (or `/nearby` if pickup coords were available — they're not, since `pickupLocation` is a `String`, not lat/lng, per the report's data model) to get a list, picks the first (or the explicitly-requested `driverId` if provided in the request body).
   - Calls `PUT http://driver-service/api/drivers/{driverId}/availability` with `isAvailable=false` to reserve the driver.
   - Sets `ride.driverId`, `status=MATCHED`, `matchedAt=now`, saves.
   - Publishes `ride.status.changed` (status=MATCHED).
   - If no drivers available, throw `ResourceNotFoundException` ("no available drivers").

4. **`startRide(id)`** → verifies `status == MATCHED` (else `InvalidStateException`), sets `status=IN_PROGRESS`, `startedAt=now`, saves, publishes event.

5. **`completeRide(id)`** → verifies `status == IN_PROGRESS` (else `InvalidStateException`), sets `status=COMPLETED`, `completedAt=now`.
   - Calls `payment-service` to process payment: **this must be a placeholder stub** since payment-service isn't implemented yet (per `AGENTS.md` §2.3) — write the `POST http://payment-service/api/payments/process` call wrapped so a connection failure doesn't crash the ride completion (payment-service literally doesn't exist yet), with the exact TODO-comment block format from `AGENTS.md` §2.3 documenting target endpoint, expected request/response shape (`rideId, riderId, driverId, distance` → `Payment` with `amount`), and current mock behavior (skip the call, leave `finalFare = fareEstimate` or a fixed value).
   - Calls `PUT http://driver-service/api/drivers/{driverId}/availability` with `isAvailable=true` to free the driver.
   - Saves ride, publishes `ride.status.changed` (status=COMPLETED).

6. **`cancelRide(id)`** → verifies ride is not already `COMPLETED`/`CANCELLED` (else `InvalidStateException`). If a driver was already matched, calls driver-service to set `isAvailable=true` again (release the reservation). Sets `status=CANCELLED`, saves, publishes event.

7. **`getRidesByRider(riderId)`** / **`getRidesByDriver(driverId)`** → straight repository lookups → map to list of `RideResponse`.

8. **`getActiveRides()`** → `findByStatusIn([REQUESTED, MATCHED, IN_PROGRESS])` → map to list.

9. Private `toResponse(Ride)` mapper, same style as driver-service.
10. Private `publishRideStatusChanged(Ride, String message)` helper wrapping `rabbitTemplate.convertAndSend(exchange, routingKey, event)`.

**Open design decisions to flag to the user/team before/while implementing** (don't block on these — make the documented default choice and note it in the doc, consistent with "no unnecessary complexity" from AGENTS.md):
- Whether one rider can have multiple concurrent active rides (recommend: not enforced initially, same minimal-validation posture as the other two services).
- Driver selection strategy on match (recommend: first available from the list; note "nearest" would need pickup lat/lng which isn't in the current data model — either extend `RideRequest`/`Ride` with optional lat/lng fields to support real nearby-matching, or keep it simple and pick first-available. **Recommend adding optional `pickupLat`/`pickupLng` to `RideRequest`** so `driver-service`'s existing `/api/drivers/nearby` endpoint can actually be used — this is a small addition that unlocks a much better match quality with code that already exists on the other side).

---

## Subplan 7 — Controller

**Goal:** `controller/RideController.java`, `@RestController @RequestMapping("/api/rides") @RequiredArgsConstructor`, thin pass-through to `RideService`, matching the report's endpoint table exactly:

| Method | Endpoint | Calls | Status |
|---|---|---|---|
| POST | `/request` | `requestRide` | 201 |
| GET | `/{id}` | `getRide` | 200 |
| PUT | `/{id}/match` | `matchDriver` | 200 |
| PUT | `/{id}/start` | `startRide` | 200 |
| PUT | `/{id}/complete` | `completeRide` | 200 |
| PUT | `/{id}/cancel` | `cancelRide` | 200 |
| GET | `/rider/{riderId}` | `getRidesByRider` | 200 |
| GET | `/driver/{driverId}` | `getRidesByDriver` | 200 |
| GET | `/active` | `getActiveRides` | 200 |

No `SecurityConfig` needed unless `spring-boot-starter-security` gets pulled in transitively — ride-service doesn't need password encoding, so skip it (only add if a build error demands it, per `AGENTS.md` §4.2).

---

## Subplan 8 — HTTP Test Requests

**Goal:** `requests/ride.http` (direct-port) and `requests/ride_api-gateway.http` (gateway-routed), following the exact style of `requests/driver.http`: sequential numbered requests, IntelliJ `> {% client.test(...) %}` blocks, `client.global.set(...)` to chain IDs across requests.

Cover, in order: register rider + driver users (via user-service) → create driver profile (via driver-service) → request ride → get ride by id → match driver → (error case: match again on already-matched ride → expect 409) → start ride → (error case: complete a `REQUESTED`/not-yet-started ride elsewhere → 409) → complete ride → get rides by rider → get rides by driver → get active rides (should now exclude the completed one) → cancel-ride happy path on a fresh second ride → not-found cases (`GET /api/rides/{bogusId}` → 404).

---

## Subplan 9 — Documentation

**Goal:** `docs/ride-service-doc.md`, following the exact section structure of `docs/driver-service-doc.md`: Overview, Data Model table, REST API Endpoints table, Package Structure tree, Key Design Decisions (including the fare-estimate stub, payment-service stub, driver-matching strategy chosen), What Remains/Stubs table (payment-service integration, real geospatial matching, notification-service consumption, input validation), How to Test steps (start order: eureka → gateway → user → driver → [rabbitmq] → ride; run `requests/ride_api-gateway.http`).

---

## Subplan 10 — Build Verification

**Goal:** Close the loop per `AGENTS.md` §3.3.

- `mvn clean compile -pl ride-service` (and `-am` if needed for parent context) from repo root.
- Fix any Lombok/import/compile errors.
- If RabbitMQ isn't running locally, confirm the app still *boots* in isolation isn't required for a compile check, but note in the doc that a local RabbitMQ instance (`localhost:5672`, guest/guest) is required to fully run the service (per README prerequisites) — the `spring-boot-starter-amqp` auto-configuration will fail fast on startup without it, which is expected/documented behavior, not a bug to work around.

---

## Execution Order Summary

0 (fix skeleton) → 1 (model) → 2 (dto) → 3 (repository) → 4 (exceptions) → 5 (config) → 6 (service) → 7 (controller) → 8 (http tests) → 9 (docs) → 10 (build verify)

This mirrors `AGENTS.md §2.1` exactly, with Subplan 0 prepended since the current skeleton is broken and must be fixed before anything else will compile.
