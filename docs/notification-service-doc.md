# Notification Service — Implementation Documentation

## Overview
The Notification Service (port `8085`) consumes `ride.status.changed` events from Ride Service and `payment.completed` events from Payment Service off RabbitMQ, and turns them into stored `Notification` records. It exposes a small read/mark-read REST API so a client can list a user's notifications, filter to unread ones, and flip the read flag. It never publishes anything and makes no outbound REST calls — it's a pure consumer plus a thin read API.

## Data Model
The `Notification` entity stores the following fields in the `notifications` collection within `uber_notification_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `userId` | String | Indexed, references User Service — the rider or driver being notified |
| `type` | Enum | `RIDE_REQUESTED, RIDE_MATCHED, RIDE_STARTED, RIDE_COMPLETED, RIDE_CANCELLED, PAYMENT_COMPLETED` |
| `message` | String | Generated from the event's own content — no cross-service enrichment |
| `isRead` | Boolean | Defaults to `false` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/api/notifications/user/{userId}` | Get all notifications for a user | 200 |
| GET | `/api/notifications/user/{userId}/unread` | Get only unread notifications for a user | 200 |
| PUT | `/api/notifications/{id}/read` | Mark a notification as read | 200, 404 |

## RabbitMQ Queues Consumed

| Queue | Event | Action |
|-------|-------|--------|
| `ride.status.queue` | `ride.status.changed` | Creates a notification for the rider, and for the driver too if one was matched at that point |
| `payment.queue` | `payment.completed` | Creates a notification for the rider only |

## Package Structure
```
org.uber.notificationservice
├── NotificationServiceApplication.java  # Spring Boot entry point
├── config/
│   ├── MongoConfig.java                 # @EnableMongoAuditing
│   └── RabbitMQConfig.java              # Redeclares both queues; no RabbitTemplate (consumer only)
├── controller/
│   └── NotificationController.java      # REST endpoints
├── dto/
│   ├── NotificationResponse.java        # Output DTO
│   ├── RideStatusChangedEvent.java      # Incoming event — local copy of ride-service's contract
│   └── PaymentCompletedEvent.java       # Incoming event — local copy of payment-service's contract
├── exception/
│   ├── ResourceNotFoundException.java   # 404 errors
│   ├── DuplicateResourceException.java  # 409 (kept for parity, unused — no uniqueness rules here)
│   └── GlobalExceptionHandler.java      # Centralized error handling
├── listener/
│   ├── RideEventListener.java           # @RabbitListener on ride.status.queue
│   └── PaymentEventListener.java        # @RabbitListener on payment.queue
├── model/
│   ├── Notification.java                # MongoDB document entity
│   └── NotificationType.java            # Notification type enum
├── repository/
│   └── NotificationRepository.java      # MongoDB queries
└── service/
    └── NotificationService.java         # Business logic (event handling + read API)
```

## Key Design Decisions

1. **Event DTOs are local copies, typed loosely on purpose.** `RideStatusChangedEvent.status` and `PaymentCompletedEvent.status` are declared as `String`, not the producer's `RideStatus`/`PaymentStatus` enum — this service doesn't own those types and shouldn't take a compile-time dependency on another service's internals just to receive a message. The JSON on the wire is identical either way, since Spring's message converter serializes enums as their name string regardless.

2. **`@RabbitListener` deserializes by the listener's declared parameter type**, not by the producer's embedded class-name header — this is why ride-service, payment-service, and notification-service can each keep their own independent copy of an event DTO in their own package with no shared library, and it still works correctly.

3. **Rider always notified; driver only if matched.** Every `ride.status.changed` event creates a notification for the rider. If `driverId` is present on the event, the driver gets the identical message too — writing separate rider/driver wording was judged unnecessary complexity, since ride-service's existing event messages ("Ride requested", "Driver matched", etc.) already read fine for either audience.

4. **Payment notifications go to the rider only**, matching `report.md` §7.3.3's flow — there's no driver-facing payment notification in this design.

5. **A dedicated `listener/` package**, rather than folding `@RabbitListener` components into `service/`. This deviates from the generic package list in `AGENTS.md` (`model, dto, repository, service, controller, exception, config`) but matches `report.md` §8.4's own project-structure diagram, which specifically calls out a `listener/` package for this service.

6. **No dead-letter queue, no manual ack, no retry/backoff configuration.** A malformed message or an unmapped ride-status string throws inside the listener and falls back to Spring AMQP's default handling — acceptable for this project's scope, and consistent with ride-service's producer side also not configuring any custom error handling.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Real delivery (push/SMS/email) | **Not Implemented** | Notifications are just DB rows — "simulates delivery" per `report.md` §5.3.5. A client discovers them by polling the REST API. |
| Dead-letter queue / retry policy | **Not Implemented** | Relies entirely on Spring AMQP's defaults. |
| Input validation | **Basic only** | No `@Valid` / `@NotBlank` annotations. |

## How to Test
1. Start `eureka-server`, `api-gateway`, and RabbitMQ (`docker compose up -d`).
2. Start `user-service`, `driver-service`, `payment-service`, and `notification-service`. Order among these four doesn't matter, but all four (plus `ride-service`) need to be up to generate real events end-to-end.
3. Start `ride-service` last — it's what actually publishes the events this service consumes.
4. Run `requests/notification.http` requests 1-2 (or `requests/notification_api-gateway.http` request 3) — these need no prior events and confirm the baseline empty-state and 404 behavior.
5. Run `requests/ride_api-gateway.http` fully, in the same IntelliJ HTTP Client session, to drive a real ride through completion (which now also calls payment-service).
6. Run the remaining requests in `requests/notification.http` / `requests/notification_api-gateway.http` — they read the `riderId` global variable set by the ride test file, and confirm notifications (including a `PAYMENT_COMPLETED` one) exist, that `/unread` filters correctly, and that `/read` flips the flag.
