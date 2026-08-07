# Payment Service — Implementation Documentation

## Overview
The Payment Service (port `8084`) calculates ride fares and processes payment for completed rides. It is called synchronously by Ride Service's `completeRide()` step, and publishes a `payment.completed` event to RabbitMQ on every successful payment so Notification Service can notify the rider. It makes no outbound calls of its own — every field it needs (`rideId`, `riderId`, `driverId`) is supplied by the caller.

## Data Model
The `Payment` entity stores the following fields in the `payments` collection within `uber_payment_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `rideId` | String | Indexed, references Ride Service — one payment per ride, enforced in the service layer |
| `riderId` | String | Indexed, references User Service |
| `driverId` | String | Indexed, nullable, references User Service |
| `amount` | Double | Computed fare |
| `status` | Enum | `PENDING, COMPLETED, FAILED, REFUNDED` — defaults to `PENDING`; only `COMPLETED` is ever produced today |
| `paymentMethod` | String | Defaults to `"CASH"` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |
| `completedAt` | LocalDateTime | Set manually when a payment is processed |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/api/payments/calculate` | Preview a fare for a ride (no persistence) | 200 |
| POST | `/api/payments/process` | Process payment for a completed ride, creating a `Payment` record | 201, 409 |
| GET | `/api/payments/{id}` | Get payment by id | 200, 404 |
| GET | `/api/payments/ride/{rideId}` | Get the payment for a specific ride | 200, 404 |
| GET | `/api/payments/rider/{riderId}` | Get payment history for a rider | 200 |
| GET | `/api/payments/driver/{driverId}` | Get earnings history for a driver | 200 |

## Package Structure
```
org.uber.paymentservice
├── PaymentServiceApplication.java       # Spring Boot entry point
├── config/
│   ├── MongoConfig.java                 # @EnableMongoAuditing
│   └── RabbitMQConfig.java              # uber.exchange / payment.queue / payment.completed
├── controller/
│   └── PaymentController.java           # REST endpoints
├── dto/
│   ├── PaymentCalculateRequest.java     # Input for fare preview
│   ├── FareResponse.java                # Output DTO for fare preview
│   ├── PaymentProcessRequest.java       # Input for processing payment
│   ├── PaymentResponse.java             # Output DTO for a payment
│   └── PaymentCompletedEvent.java       # RabbitMQ event payload
├── exception/
│   ├── ResourceNotFoundException.java   # 404 errors
│   ├── DuplicateResourceException.java  # 409 errors
│   └── GlobalExceptionHandler.java      # Centralized error handling
├── model/
│   ├── Payment.java                     # MongoDB document entity
│   └── PaymentStatus.java               # Status enum
├── repository/
│   └── PaymentRepository.java           # MongoDB queries
└── service/
    └── PaymentService.java              # Business logic
```

## Key Design Decisions

1. **No call to User Service.** `report.md` §5.3.4 suggests fetching rider/driver details from User Service, but `Payment` only stores IDs, matching the ID-only referencing convention already established by `Ride.riderId`/`driverId`. This removes a runtime dependency on User Service being up, and keeps the entity free of data that could go stale.

2. **Distance is simulated, not real.** `Ride` has no dropoff coordinates, so a real distance calculation isn't feasible without extending the data model. Per `report.md`'s own note ("Distance will be simulated using a simple calculation since real GPS/mapping integration is out of scope"), `PaymentService` generates a pseudo-random distance between 2km and 20km on every calculate/process call and applies the fare formula `baseFare (50.0) + distance × perKmRate (15.0)`. This means the same ride can get a different fare on repeated `/calculate` calls — expected, since it's a preview, not a persisted value.

3. **Payment processing always succeeds.** There is no real payment gateway. `processPayment` always produces `status = COMPLETED`; `FAILED` and `REFUNDED` exist on the enum for parity with the report's spec but no code path produces them.

4. **Duplicate-payment guard.** `processPayment` checks `findByRideId` first and throws `DuplicateResourceException` (409) if a payment already exists for that ride. This protects against double-billing if Ride Service's completion call is ever retried.

5. **`/calculate` exposes formula components, not just the total.** `FareResponse` returns `distanceKm`, `baseFare`, and `perKmRate` alongside `fare`, making the simulated calculation demonstrable rather than an opaque number.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Real payment gateway integration | **Not Implemented** | No Stripe/PayPal — "processing" is simulated as always-succeeding. |
| Real distance from a Mapping Service | **Not Implemented** | Distance is a simulated random value, not derived from actual ride coordinates. |
| Refund flow | **Not Implemented** | `REFUNDED` exists on `PaymentStatus` but has no endpoint or code path. |
| Input validation | **Basic only** | No `@Valid` / `@NotBlank` annotations. |

## How to Test
1. Start `eureka-server` (required for registry).
2. Start `api-gateway` (required for gateway-routed tests).
3. Start RabbitMQ (`docker compose up -d`) — required at boot, `spring-boot-starter-amqp` connects eagerly.
4. Start `payment-service`.
5. Run `requests/payment.http` (direct port `8084`) to test the service in isolation — no other business service is required, since payment-service makes no outbound calls.
6. Run `requests/payment_api-gateway.http` (via gateway `8080`) to confirm routing and JWT enforcement — this one needs `user-service` running too, since it logs in first to get a token.
