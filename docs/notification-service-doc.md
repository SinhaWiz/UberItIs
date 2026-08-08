# Notification Service — Implementation Documentation

## Overview
The Notification Service (port `8085`) consumes asynchronous events from RabbitMQ and persists notifications for riders and drivers. It has no synchronous callers — Ride Service and Payment Service publish events fire-and-forget, and this service is solely responsible for turning those events into per-user notification records that clients can poll via REST. It never blocks or fails the publishing service's request.

## Data Model
The `Notification` entity stores the following fields in the `notifications` collection within `uber_notification_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `userId` | String | References User Service user ID (rider or driver) |
| `type` | Enum | `RIDE_REQUESTED`, `RIDE_MATCHED`, `RIDE_STARTED`, `RIDE_COMPLETED`, `RIDE_CANCELLED`, `PAYMENT_COMPLETED` |
| `message` | String | Human-readable notification text |
| `isRead` | Boolean | Defaults to `false` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |

## RabbitMQ Queues Consumed

| Queue | Routing Key | Event Payload | Action |
|-------|-------------|----------------|--------|
| `ride.status.queue` | `ride.status.changed` | `rideId, riderId, driverId, status, message, timestamp` | Creates a notification for the rider, and the driver if assigned |
| `payment.queue` | `payment.completed` | `paymentId, riderId, amount, status, timestamp` | Creates a `PAYMENT_COMPLETED` notification for the rider |

Both queues are bound to the shared `uber.exchange` topic exchange, the same exchange ride-service and payment-service publish to.

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/api/notifications/user/{userId}` | Get all notifications for a user | 200 |
| GET | `/api/notifications/user/{userId}/unread` | Get unread notifications for a user | 200 |
| PUT | `/api/notifications/{id}/read` | Mark a notification as read | 200, 404 |

There is intentionally no create endpoint — notifications can only be produced by consuming a RabbitMQ event.

## Package Structure
```
org.uber.notificationservice
├── NotificationServiceApplication.java  # Spring Boot entry point
├── config/
│   ├── MongoConfig.java                 # @EnableMongoAuditing
│   └── RabbitMQConfig.java              # Exchange, queues, bindings, JSON converter
├── controller/
│   └── NotificationController.java      # REST endpoints
├── dto/
│   ├── NotificationResponse.java        # Output DTO
│   ├── RideStatusChangedEvent.java      # Consumer-side mirror of ride-service's event
│   └── PaymentCompletedEvent.java       # Consumer-side mirror of payment-service's event
├── exception/
│   ├── ResourceNotFoundException.java   # 404 errors
│   └── GlobalExceptionHandler.java      # Centralized error handling
├── listener/
│   ├── RideStatusEventListener.java     # @RabbitListener on ride.status.queue
│   └── PaymentEventListener.java        # @RabbitListener on payment.queue
├── model/
│   ├── Notification.java                # MongoDB document entity
│   ├── NotificationType.java            # Notification type enum
│   ├── RideStatus.java                  # Local mirror of ride-service's RideStatus
│   └── PaymentStatus.java               # Local mirror of payment-service's PaymentStatus
├── repository/
│   └── NotificationRepository.java      # MongoDB queries
└── service/
    └── NotificationService.java         # Business logic
```

## Key Design Decisions

1. **No shared domain classes across services:** `RideStatusChangedEvent`, `RideStatus`, `PaymentCompletedEvent`, and `PaymentStatus` are defined locally in notification-service rather than importing ride-service's or payment-service's versions. Microservices should not share compiled Java types across module boundaries — Jackson deserializes purely by field name and enum constant name, so a structurally identical local copy is sufficient and keeps the services independently deployable.

2. **Consumer-only RabbitMQ config:** Unlike ride-service and payment-service, `RabbitMQConfig` here declares no `RabbitTemplate` bean — this service never publishes, only consumes.

3. **Explicit `@Bean` method calls for bindings:** `rideStatusBinding()` and `paymentBinding()` call `rideStatusQueue()` / `paymentQueue()` directly rather than taking them as method parameters. With two `Queue` beans declared in the same `@Configuration` class, parameter-based autowiring is ambiguous unless the compiler's `-parameters` flag preserves parameter names for Spring to match against. Calling the bean methods directly (safe under Spring's CGLIB proxying, which returns the singleton) removes that fragility entirely.

4. **Fire-and-forget message construction:** For `ride.status.changed`, the listener reuses the human-readable `message` string ride-service already built rather than reconstructing it from `status`. For `payment.completed`, which carries no message field, the listener builds its own text from `amount`.

5. **`status` still drives the notification `type`:** Even though the raw event message is reused as-is, `RideStatusEventListener` maps the ride's `RideStatus` to the corresponding `NotificationType` (e.g. `IN_PROGRESS` → `RIDE_STARTED`) so notifications remain filterable/typed on the read side.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Push/SMS/Email delivery | **Not Implemented** | Per `docs/report.md` §5.3.5, this service only persists and exposes notifications ("simulates delivery"). Real delivery channels are out of scope. |
| Retry/dead-letter handling | **Not Implemented** | If `NotificationService.createNotification` throws (e.g. Mongo unavailable), the message is currently just nacked/requeued by default Spring AMQP behavior — no dead-letter queue is configured. |
| Input Validation | **Basic only** | No `@Valid` / `@NotBlank` annotations on incoming event fields; a malformed event would surface as a listener exception rather than a clean validation error. |
| Pagination | **Not Implemented** | `GET /api/notifications/user/{userId}` returns the full list; no `page`/`size` params. |
| `userId` index | **Not Implemented** | `NotificationRepository` queries by `userId` without an explicit `@Indexed` annotation on the field. |

## How to Test
1. Start `eureka-server` (required for registry).
2. Start `api-gateway` (required for routing).
3. Start `user-service` (required to register a test user).
4. Start RabbitMQ (`docker compose up -d` from the project root).
5. Start `notification-service`.
6. Open `requests/notification_api-gateway.http` in IntelliJ and run the requests sequentially — this covers registration, empty-list retrieval, and the 404 case for marking a non-existent notification as read.
7. To exercise the actual event-consumption path, either run a full ride through `ride-service`, or publish a test message manually via the RabbitMQ management UI (`http://localhost:15672`, `guest`/`guest`) to the `uber.exchange` exchange with routing key `ride.status.changed` or `payment.completed` — see the comment block at the top of `requests/notification.http` for a sample payload.

> **Note:** Because this service has no REST create endpoint, `requests/notification.http` and `requests/notification_api-gateway.http` can only fully exercise the mark-as-read and non-empty-list paths after a real event has been consumed.
