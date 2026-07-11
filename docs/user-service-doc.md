# User Service — Implementation Documentation

## Overview
The User Service (port `8081`) manages registration, authentication, and profile operations for all users in the ride-sharing system. It serves as the identity source that other microservices (Ride, Driver, Payment) call to validate users.

## What Was Implemented

### Data Model
The `User` entity stores the following fields in the `users` collection within `uber_user_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `name` | String | Full name |
| `email` | String | Unique index, used for login |
| `password` | String | BCrypt-hashed, never exposed in responses |
| `phone` | String | Phone number |
| `role` | Enum | `RIDER`, `DRIVER`, or `ADMIN` (defaults to `RIDER`) |
| `createdAt` | LocalDateTime | Auto-set on creation via `@CreatedDate` |
| `updatedAt` | LocalDateTime | Auto-set on modification via `@LastModifiedDate` |

### REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/api/users/register` | Register a new user | 201, 409 |
| POST | `/api/users/login` | Authenticate and receive token | 200, 400 |
| GET | `/api/users/{id}` | Get user profile by ID | 200, 404 |
| PUT | `/api/users/{id}` | Update user profile | 200, 404 |
| GET | `/api/users` | Get all users (admin) | 200 |
| GET | `/api/users/role/{role}` | Get users by role | 200 |

### Architecture (Package Structure)
```
org.uber.userservice
├── UserServiceApplication.java        # Spring Boot entry point
├── config/
│   └── SecurityConfig.java            # BCrypt bean + disables Spring Security defaults
├── controller/
│   └── UserController.java            # REST endpoints
├── dto/
│   ├── RegisterRequest.java           # Input for registration
│   ├── LoginRequest.java              # Input for login
│   ├── UserResponse.java              # Output (no password)
│   └── LoginResponse.java             # Token + user details
├── exception/
│   ├── ResourceNotFoundException.java # 404 errors
│   ├── DuplicateResourceException.java# 409 errors
│   └── GlobalExceptionHandler.java    # Centralized error handling
├── model/
│   ├── User.java                      # MongoDB document entity
│   └── Role.java                      # RIDER, DRIVER, ADMIN enum
├── repository/
│   └── UserRepository.java            # MongoDB queries
└── service/
    └── UserService.java               # Business logic
```

### Key Design Decisions

1. **DTOs for request/response separation:** The `User` entity is never directly returned from the API. `UserResponse` strips the password field, preventing accidental credential leakage.

2. **BCrypt password hashing:** Passwords are hashed using `BCryptPasswordEncoder` provided by `spring-boot-starter-security`. The full Spring Security filter chain is explicitly disabled in `SecurityConfig.java` to keep all endpoints open — authentication is meant to be handled at the API Gateway level, not within individual services.

3. **Placeholder JWT token:** The login endpoint returns a placeholder UUID token (e.g., `placeholder-jwt-<uuid>`). This demonstrates the login flow without building a full JWT infrastructure. A real implementation would use a dedicated Auth Service (see report Section 4, #15).

4. **Partial updates:** The `PUT /api/users/{id}` endpoint only updates `name`, `phone`, and `role`. Email and password changes are intentionally excluded to avoid breaking login flows or uniqueness constraints without proper verification.

5. **Centralized exception handling:** `GlobalExceptionHandler` catches `ResourceNotFoundException` (404), `DuplicateResourceException` (409), and `IllegalArgumentException` (400), returning clean JSON error responses instead of raw stack traces.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Rating Calculation | **Not Implemented** | Rating fields default to `0.0`. Will be updated via events when Rating Service is built. |
| Email validation format | **Not implemented** | Could add `@Email` annotation with Bean Validation. |
| Password change endpoint | **Not implemented** | Would need current-password verification flow. |
| Input validation | **Basic only** | No `@Valid` / `@NotBlank` annotations. Could be added with `spring-boot-starter-validation`. |
| Inter-service auth | **Not implemented** | Other services calling User Service are trusted (no token verification between services). |

## How to Test
1. Start `eureka-server` (required for registry).
2. Start `user-service`.
3. Open `requests/user-service.http` in IntelliJ.
4. Run tests sequentially from top to bottom.

> **Note:** If testing after a fresh database, run the "Register a Rider" request first. The test scripts auto-capture the generated `riderId` and `driverId` for use in subsequent requests.
