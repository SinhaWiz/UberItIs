# Payment Service — Implementation Documentation

## Overview
The Payment Service (port `8084`) calculates ride fares, stores completed payments, and publishes a `payment.completed` event for downstream consumers. It owns the payment record for each ride and exposes read endpoints for payment lookup and history.

## Data Model
The `Payment` entity stores the following fields in the `payments` collection within `uber_payment_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `rideId` | String | Unique index, references the ride being paid for |
| `riderId` | String | Indexed, references the rider user ID |
| `driverId` | String | Indexed, references the driver user ID |
| `amount` | Double | Calculated fare amount |
| `status` | Enum | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` (defaults to `PENDING`) |
| `paymentMethod` | String | Defaults to `CASH` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |
| `completedAt` | LocalDateTime | Set when payment is processed |
| `updatedAt` | LocalDateTime | Auto-set via `@LastModifiedDate` |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/api/payments/calculate` | Calculate the fare for a ride | 200, 400 |
| POST | `/api/payments/process` | Process and store a completed ride payment | 200, 400 |
| GET | `/api/payments/{id}` | Get payment details by payment id | 200, 404 |
| GET | `/api/payments/ride/{rideId}` | Get payment details for a ride | 200, 404 |
| GET | `/api/payments/rider/{riderId}` | Get payment history for a rider | 200 |
| GET | `/api/payments/driver/{driverId}` | Get payment history for a driver | 200 |

## Package Structure
```
org.uber.paymentservice
├── PaymentServiceApplication.java      # Spring Boot entry point
├── config/
│   ├── MongoConfig.java                # @EnableMongoAuditing
│   └── RabbitMQConfig.java             # Exchange, queue, binding, RabbitTemplate
├── controller/
│   └── PaymentController.java          # REST endpoints
├── dto/
│   ├── CalculateFareRequest.java       # Input for fare calculation
│   ├── CalculateFareResponse.java      # Fare response wrapper
│   ├── PaymentCompletedEvent.java      # RabbitMQ event payload
│   ├── PaymentResponse.java            # Output DTO for payment lookups
│   └── ProcessPaymentRequest.java      # Input for payment processing
├── exception/
│   ├── GlobalExceptionHandler.java     # Centralized error handling
│   └── ResourceNotFoundException.java  # 404 errors
├── model/
│   ├── Payment.java                    # MongoDB document entity
│   └── PaymentStatus.java              # PENDING, COMPLETED, FAILED, REFUNDED enum
├── repository/
│   └── PaymentRepository.java          # MongoDB queries
└── service/
    └── PaymentService.java            # Fare calculation, persistence, event publishing
```

## Key Design Decisions

1. **DTOs for request/response separation:** Controllers return `PaymentResponse` and never expose the `Payment` entity directly.

2. **Single source of fare logic:** Both `calculate` and `process` use the same simplified `baseFare + distance × perKmRate` formula so the payment amount stays consistent.

3. **Payment completion event:** `processPayment` saves the payment first, then publishes `payment.completed` to the shared `uber.exchange` topic exchange for the Notification Service to consume later.

4. **JSON RabbitMQ messages:** `RabbitMQConfig` uses `JacksonJsonMessageConverter` so the event is serialized as JSON instead of Java objects.

5. **Simple state model:** A processed payment is stored as `COMPLETED` immediately because the project treats payment processing as simulated, not a multi-step external gateway integration.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| External payment gateway | **Not Implemented** | Payment is simulated locally; no third-party processor is called. |
| Payment retries / failure workflow | **Not Implemented** | `FAILED` and `REFUNDED` exist in the enum but are not yet used by any endpoint. |
| Notification Service consumer | **Not Implemented** | `payment.completed` is published, but the consumer service is still a skeleton. |
| Input validation annotations | **Basic only** | Negative and missing distance are checked manually; no Bean Validation annotations are used. |

## How to Test

1. Start `eureka-server`.
2. Start `rabbitmq` on `localhost:5672`.
3. Start `payment-service`.
4. Open `requests/payment.http` in IntelliJ.
5. Run the requests sequentially from top to bottom.

> **Note:** The request file covers both happy paths and simple error cases, including invalid distance (`400`) and missing payment lookup (`404`).