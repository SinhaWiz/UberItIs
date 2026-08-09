# Notification Service — Implementation Documentation

## Overview
The Notification Service (port `8085`) is the asynchronous event consumer of the ride-sharing system. It listens on two RabbitMQ queues — `ride.status.queue` and `payment.queue` — and transforms incoming events into user-facing notification records stored in MongoDB. It exposes read-only REST endpoints for the frontend to query and mark notifications as read.

## Data Model
The `Notification` entity stores the following fields in the `notifications` collection within `uber_notification_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `userId` | String | Indexed, references the user who receives the notification |
| `type` | Enum | `RIDE_REQUESTED`, `RIDE_MATCHED`, `RIDE_STARTED`, `RIDE_COMPLETED`, `RIDE_CANCELLED`, `PAYMENT_COMPLETED` |
| `message` | String | Human-readable notification text |
| `isRead` | Boolean | Defaults to `false` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| GET | `/api/notifications/user/{userId}` | Get all notifications for a user (newest first) | 200 |
| GET | `/api/notifications/user/{userId}/unread` | Get unread notifications for a user (newest first) | 200 |
| PUT | `/api/notifications/{id}/read` | Mark a notification as read | 200, 404 |

## RabbitMQ Queues Consumed

| Queue | Routing Key | Source Service | Action |
|-------|-------------|----------------|--------|
| `ride.status.queue` | `ride.status.changed` | Ride Service | Creates notification(s) for rider and driver about ride status changes |
| `payment.queue` | `payment.completed` | Payment Service | Creates notification for rider about successful payment |

### Ride Status Event → Notification Mapping

| Ride Status | NotificationType | Rider Message | Driver Message |
|-------------|-----------------|---------------|----------------|
| `REQUESTED` | `RIDE_REQUESTED` | "Your ride has been requested. Looking for a nearby driver..." | *(no driver yet)* |
| `MATCHED` | `RIDE_MATCHED` | "A driver has been matched to your ride!" | "You have been matched to a new ride. Head to the pickup location." |
| `IN_PROGRESS` | `RIDE_STARTED` | "Your ride has started. Enjoy the trip!" | "The ride is now in progress." |
| `COMPLETED` | `RIDE_COMPLETED` | "Your ride is complete. Please proceed with payment." | "The ride is complete. Awaiting payment confirmation." |
| `CANCELLED` | `RIDE_CANCELLED` | "Your ride has been cancelled." | "The ride has been cancelled." |

### Payment Event → Notification Mapping

| Event | NotificationType | Rider Message |
|-------|-----------------|---------------|
| `payment.completed` | `PAYMENT_COMPLETED` | "Payment of ৳{amount} has been completed successfully." |

## Package Structure
```
org.uber.notificationservice
├── NotificationServiceApplication.java      # Spring Boot entry point
├── config/
│   ├── MongoConfig.java                     # @EnableMongoAuditing
│   └── RabbitMQConfig.java                  # Exchange, queues, bindings, JSON converter, listener factory
├── controller/
│   └── NotificationController.java          # REST endpoints
├── dto/
│   ├── NotificationResponse.java            # Output DTO
│   ├── PaymentCompletedEvent.java           # Consumer-side event DTO (mirrors payment-service publisher)
│   └── RideStatusChangedEvent.java          # Consumer-side event DTO (mirrors ride-service publisher)
├── exception/
│   ├── GlobalExceptionHandler.java          # Centralized error handling
│   └── ResourceNotFoundException.java       # 404 errors
├── listener/
│   ├── PaymentCompletedListener.java        # @RabbitListener on payment.queue
│   └── RideStatusListener.java              # @RabbitListener on ride.status.queue
├── model/
│   ├── Notification.java                    # MongoDB document entity
│   └── NotificationType.java               # Enum for notification categories
├── repository/
│   └── NotificationRepository.java          # MongoDB queries
└── service/
    └── NotificationService.java             # Business logic for create, query, mark-read
```

## Key Design Decisions

1. **DTOs for request/response separation:** Controllers return `NotificationResponse` and never expose the `Notification` entity directly.

2. **String-typed event fields:** The consumer-side event DTOs use `String` for fields like `status` instead of importing the publisher's enum classes (e.g., `RideStatus`, `PaymentStatus`). This avoids a compile-time coupling between microservices — the notification service can deserialize events regardless of enum changes in ride-service or payment-service.

3. **Dual notification on ride events:** When a ride status changes and a driver is assigned (`driverId != null`), the listener creates two separate notification records — one for the rider and one for the driver — each with a role-appropriate message.

4. **Payment notification for rider only:** The `payment.completed` event creates a notification for the rider confirming the amount. Driver payment notification is a future TODO (see AGENTS.md TODO #6).

5. **Consumer-side queue declaration:** `RabbitMQConfig` declares both `ride.status.queue` and `payment.queue` with their bindings to `uber.exchange`. This is idempotent — RabbitMQ will not create duplicate queues if the publisher services have already declared them.

6. **JSON deserialization via listener container factory:** A `SimpleRabbitListenerContainerFactory` is explicitly configured with `JacksonJsonMessageConverter` so that `@RabbitListener` methods automatically deserialize JSON message bodies into the corresponding event DTOs.

7. **No SecurityConfig:** Like other services, the Notification Service trusts the API Gateway's `AuthenticationFilter` for authentication and has no `spring-boot-starter-security` dependency.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Driver payment notification | **Not Implemented** | `payment.completed` events currently only notify the rider. The driver needs to be notified too (requires `driverId` on the event — see AGENTS.md TODO #6). |
| Notification delivery | **Stored only** | Notifications are saved to MongoDB and served via REST. No push/WebSocket/SSE delivery exists. |
| Bulk mark-as-read | **Not Implemented** | Only single-notification mark-as-read exists. A bulk endpoint may be useful for the frontend. |

## How to Test

1. Start `eureka-server`, `rabbitmq` (on `localhost:5672`), and `notification-service`.
2. Start `ride-service` and `payment-service` (the event publishers).
3. Trigger a ride lifecycle (request → match → start → complete) and a payment.
4. Open `requests/notification.http` in IntelliJ and run the requests to verify notifications were created.
5. Replace `{{riderId}}` and `{{driverId}}` with actual user IDs from the test flow.
