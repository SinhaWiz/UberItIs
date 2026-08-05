# Ride Service — Implementation Documentation

## Overview
The Ride Service (port `8082`) is the core orchestrator of the ride-sharing system. It owns the full ride lifecycle — from a rider requesting a ride, through driver matching, to ride completion or cancellation. It validates riders against the User Service, finds and reserves drivers via the Driver Service, triggers a (currently stubbed) payment on completion, and publishes `ride.status.changed` events to RabbitMQ on every status transition for the Notification Service to consume.

## Data Model
The `Ride` entity stores the following fields in the `rides` collection within `uber_ride_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `riderId` | String | Indexed, references User Service user ID |
| `driverId` | String | Indexed, nullable until matched |
| `pickupLocation` | String | Free-text location |
| `dropoffLocation` | String | Free-text location |
| `status` | Enum | `REQUESTED`, `MATCHED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Defaults to `REQUESTED` |
| `fareEstimate` | Double | Set at request time (currently a flat placeholder) |
| `finalFare` | Double | Nullable until completed |
| `requestedAt` | LocalDateTime | Auto-set via `@CreatedDate` |
| `matchedAt` | LocalDateTime | Set when a driver is matched |
| `startedAt` | LocalDateTime | Set when the ride starts |
| `completedAt` | LocalDateTime | Set when the ride completes |
| `updatedAt` | LocalDateTime | Auto-set via `@LastModifiedDate` |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/api/rides/request` | Request a new ride | 201, 404 |
| GET | `/api/rides/{id}` | Get ride details | 200, 404 |
| PUT | `/api/rides/{id}/match` | Match a driver to the ride | 200, 404, 409 |
| PUT | `/api/rides/{id}/start` | Start the ride (driver picked up rider) | 200, 404, 409 |
| PUT | `/api/rides/{id}/complete` | Complete the ride | 200, 404, 409 |
| PUT | `/api/rides/{id}/cancel` | Cancel the ride | 200, 404, 409 |
| GET | `/api/rides/rider/{riderId}` | Get ride history for a rider | 200 |
| GET | `/api/rides/driver/{driverId}` | Get ride history for a driver | 200 |
| GET | `/api/rides/active` | Get all currently active rides | 200 |

## Package Structure
```
org.uber.rideservice
├── RideServiceApplication.java          # Spring Boot entry point
├── config/
│   ├── AppConfig.java                   # RestTemplate bean (@LoadBalanced)
│   ├── MongoConfig.java                 # @EnableMongoAuditing
│   └── RabbitMQConfig.java              # uber.exchange, ride.status.queue, binding, JSON converter
├── controller/
│   └── RideController.java              # REST endpoints
├── dto/
│   ├── RideRequest.java                 # Input for ride request
│   ├── RideResponse.java                # Output DTO
│   ├── MatchDriverRequest.java          # Optional explicit driverId for matching
│   └── RideStatusChangedEvent.java      # RabbitMQ event payload
├── exception/
│   ├── ResourceNotFoundException.java   # 404 errors
│   ├── DuplicateResourceException.java  # 409 errors (reserved, unused for now)
│   ├── InvalidStateException.java       # 409 errors for illegal status transitions
│   └── GlobalExceptionHandler.java      # Centralized error handling
├── model/
│   ├── Ride.java                        # MongoDB document entity
│   └── RideStatus.java                  # REQUESTED/MATCHED/IN_PROGRESS/COMPLETED/CANCELLED enum
├── repository/
│   └── RideRepository.java              # MongoDB queries
└── service/
    └── RideService.java                 # Business logic and inter-service orchestration
```

## Key Design Decisions

1. **DTOs for request/response separation:** The `Ride` entity is never returned directly from the API. `RideResponse` provides a clean, stable output shape.

2. **Rider validation:** `requestRide` calls `GET http://user-service/api/users/{riderId}` via a `@LoadBalanced RestTemplate` to confirm the rider exists before creating a ride, mirroring `DriverService.validateUserExists`. A failed lookup throws `ResourceNotFoundException` (404).

3. **Fare estimate is a flat placeholder:** `fareEstimate` is set to a flat base fare (`50.0`) at request time rather than computing a real distance-based fare. Real fare calculation belongs to Payment Service (per report.md §5.3.4's formula, `baseFare + distance × perKmRate`) and duplicating that logic here would create two sources of truth. `finalFare` on completion currently just copies `fareEstimate` — see the Payment Service stub below.

4. **Driver matching strategy:** `matchDriver` accepts an optional `driverId` in the request body for explicit selection. If omitted, it calls `GET http://driver-service/api/drivers/available` and picks the first driver in the list. `RideRequest` was extended with optional `pickupLat`/`pickupLng` fields (not required, unused by the current matching logic) so that a future iteration can call driver-service's existing `GET /api/drivers/nearby` endpoint for real proximity-based matching without further schema changes.

5. **Driver availability reservation:** On match, `matchDriver` calls `PUT http://driver-service/api/drivers/{driverId}/availability` with `isAvailable=false` to reserve the driver. On both `completeRide` and `cancelRide` (if a driver was already matched), the same endpoint is called with `isAvailable=true` to release the driver back into the pool.

6. **State machine enforced in the service layer:** Each transition method checks the ride's current `status` before proceeding and throws `InvalidStateException` (409) on an illegal transition — e.g. starting a ride that isn't `MATCHED`, completing a ride that isn't `IN_PROGRESS`, or cancelling a ride that's already `COMPLETED`/`CANCELLED`. This keeps the lifecycle rules centralized rather than scattered across the controller.

7. **Payment Service stub:** Payment Service is not implemented yet. `completeRide`'s `processPayment` method is a documented placeholder (see the TODO comment block in `RideService.java`) that currently skips any network call and returns `fareEstimate` as `finalFare`. It documents the target endpoint (`POST http://payment-service/api/payments/process`), expected request/response shape, and what to replace once Payment Service exists.

8. **RabbitMQ publish-only:** `publishRideStatusChanged` sends a `RideStatusChangedEvent` to the `uber.exchange` topic exchange with routing key `ride.status.changed` on every transition (request, match, start, complete, cancel). `RabbitMQConfig` also declares the `ride.status.queue` and its binding so the queue exists even though Notification Service (the eventual consumer) isn't implemented yet. `JacksonJsonMessageConverter` is configured explicitly so events serialize as JSON rather than Java-serialized objects.

9. **No `SecurityConfig`:** Like Driver Service, Ride Service trusts the API Gateway's `AuthenticationFilter` for authentication and doesn't verify JWTs itself — it has no `spring-boot-starter-security` dependency.

10. **Multiple concurrent rides per rider are not restricted:** No check prevents a rider from having more than one active ride at a time, consistent with the minimal-validation posture of User Service and Driver Service.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Payment Service integration | **Stubbed** | `processPayment` skips the network call and returns `fareEstimate` as `finalFare`. Replace with a real `POST /api/payments/process` call once Payment Service is implemented. |
| Real distance-based fare calculation | **Not Implemented** | `fareEstimate` is a flat `50.0` placeholder; no geocoding/distance calculation exists. |
| Real geospatial driver matching | **Not Implemented** | `matchDriver` picks the first available driver. `pickupLat`/`pickupLng` exist on `RideRequest` but aren't yet wired to driver-service's `/api/drivers/nearby` endpoint. |
| Notification Service consumption | **Not Implemented** | `ride.status.changed` events are published to `ride.status.queue`, but no consumer exists yet. |
| Input validation | **Basic only** | No `@Valid` / `@NotBlank` annotations, consistent with User Service and Driver Service. |
| Concurrent active-ride limits | **Not Implemented** | A rider or driver can theoretically be linked to multiple in-flight rides if endpoints are called out of the expected order. |

## How to Test

### Prerequisites
1. A local RabbitMQ instance running on `localhost:5672` (default guest/guest credentials) — `spring-boot-starter-amqp`'s auto-configuration connects eagerly at startup and the service will fail to boot without it. This is expected, not a bug.
2. This machine's default `java`/`mvn` resolve to **JDK 25**, on which Lombok 1.18.46 does not run its annotation processor (confirmed to break Driver Service identically, not specific to Ride Service). Set `JAVA_HOME` to the installed Temurin 21 before building or running:
   ```
   export JAVA_HOME=/Users/nayburrahman/Library/Java/JavaVirtualMachines/temurin-21.0.11/Contents/Home
   ```

### Build verification
`mvn clean compile -pl ride-service -am` (and a full `mvn clean compile` from the repo root) both pass with `BUILD SUCCESS`. Note that `mvn test-compile` fails for **every** service in this project, including the already-implemented Driver Service — none of the module `pom.xml` files declare `spring-boot-starter-test`, so the skeleton `*ApplicationTests.java` classes can't resolve `@SpringBootTest`/`@Test`. This is a pre-existing, project-wide gap (not introduced by Ride Service) and is explicitly anticipated by `AGENTS.md` §3.3 ("Test compilation failures... either fix it or skip tests with `-DskipTests`"); adding the test starter dependency consistently across all services is out of scope for this service's implementation.

### Startup order
1. Start `eureka-server` (required for registry).
2. Start `api-gateway` (required for gateway-routed tests).
3. Start `user-service` (required for rider validation).
4. Start `driver-service` (required for driver matching).
5. Ensure RabbitMQ is running.
6. Start `ride-service`.

### Running tests
- Open `requests/ride.http` in IntelliJ for direct-port tests (ports 8081/8082/8083, no auth).
- Open `requests/ride_api-gateway.http` for gateway-routed tests (port 8080, requires JWT login first — the script captures the token automatically).
- Run each file's requests sequentially from top to bottom on a fresh database.
