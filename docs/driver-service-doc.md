# Driver Service — Implementation Documentation

## Overview
The Driver Service (port `8083`) manages driver-specific operations in the ride-sharing system. It handles driver profile creation and updates, availability toggling, location tracking, and geographic queries for finding nearby available drivers. The Ride Service calls this service to find and assign drivers to ride requests.

## Data Model
The `DriverProfile` entity stores the following fields in the `driver_profiles` collection within `uber_driver_db`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Auto-generated MongoDB ObjectId |
| `userId` | String | Unique index, references User Service user ID |
| `vehicleModel` | String | e.g. "Toyota Axio" |
| `vehiclePlate` | String | e.g. "DHA-1234" |
| `vehicleColor` | String | e.g. "White" |
| `isAvailable` | Boolean | Defaults to `true` (online) |
| `currentLatitude` | Double | Defaults to `0.0` |
| `currentLongitude` | Double | Defaults to `0.0` |
| `totalRides` | Integer | Defaults to `0` |
| `rating` | Double | Defaults to `0.0` |
| `createdAt` | LocalDateTime | Auto-set via `@CreatedDate` |
| `updatedAt` | LocalDateTime | Auto-set via `@LastModifiedDate` |

## REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| POST | `/api/drivers/profile` | Create a new driver profile | 201, 404, 409 |
| GET | `/api/drivers/{userId}` | Get driver profile by user ID | 200, 404 |
| PUT | `/api/drivers/{userId}` | Update vehicle information | 200, 404 |
| PUT | `/api/drivers/{userId}/availability` | Toggle online/offline status | 200, 404 |
| PUT | `/api/drivers/{userId}/location` | Update current GPS location | 200, 404 |
| GET | `/api/drivers/available` | Get all available drivers | 200 |
| GET | `/api/drivers/nearby?lat=&lng=&radius=` | Get available drivers near location | 200 |

## Package Structure
```
org.uber.driverservice
├── DriverServiceApplication.java        # Spring Boot entry point
├── config/
│   ├── AppConfig.java                   # RestTemplate bean
│   └── MongoConfig.java                 # @EnableMongoAuditing
├── controller/
│   └── DriverController.java            # REST endpoints
├── dto/
│   ├── AvailabilityRequest.java         # Input for toggling availability
│   ├── DriverProfileRequest.java        # Input for create/update profile
│   ├── DriverProfileResponse.java       # Output DTO
│   └── LocationUpdateRequest.java       # Input for location update
├── exception/
│   ├── ResourceNotFoundException.java   # 404 errors
│   ├── DuplicateResourceException.java  # 409 errors
│   └── GlobalExceptionHandler.java      # Centralized error handling
├── model/
│   └── DriverProfile.java               # MongoDB document entity
├── repository/
│   └── DriverProfileRepository.java     # MongoDB queries
└── service/
    └── DriverService.java               # Business logic
```

## Key Design Decisions

1. **DTOs for request/response separation:** The `DriverProfile` entity is never returned directly from the API. `DriverProfileResponse` ensures clean JSON output.

2. **User existence validation:** When creating a driver profile, `DriverService` calls `GET http://user-service/api/users/{userId}` via `RestTemplate` to verify the user exists. If the user doesn't exist or the call fails, a `ResourceNotFoundException` (404) is thrown. This prevents orphan driver profiles.

3. **Nearby driver query:** The `GET /api/drivers/nearby` endpoint uses a bounding-box approximation on latitude/longitude coordinates. A latitude delta of `radius / 111.0` and a longitude delta of `radius / (111.0 × cos(lat))` are computed, then MongoDB finds available drivers within those bounds. This avoids requiring a geospatial 2dsphere index while providing reasonable accuracy for small radii.

4. **Partial updates:** The `PUT /api/drivers/{userId}` endpoint only updates vehicle fields (`vehicleModel`, `vehiclePlate`, `vehicleColor`). The `PUT /api/drivers/{userId}/location` only updates coordinates. Availability has its own dedicated endpoint. This follows the principle of single-responsibility endpoints.

5. **Availability defaults to true:** New driver profiles are created with `isAvailable = true`, meaning drivers start as online by default.

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Rating Calculation | **Not Implemented** | Rating field defaults to `0.0`. Would be updated via events when Rating Service is built. |
| Total Rides Counter | **Not Implemented** | Currently defaults to `0`. Would be incremented by Ride Service on ride completion via REST call. |
| Geospatial 2dsphere Index | **Not Implemented** | Current bounding-box approach is approximate. A proper `@GeoSpatialIndexed` with `$near` query would be more accurate. |
| Input Validation | **Basic only** | No `@Valid` / `@NotBlank` annotations. Could be added with `spring-boot-starter-validation`. |
| Driver Earnings Tracking | **Not Implemented** | Earnings are tracked in Payment Service. Driver Service does not cache them. |

## How to Test
1. Start `eureka-server` (required for registry).
2. Start `api-gateway` (required for routing).
3. Start `user-service` (required for user validation).
4. Start `driver-service`.
5. Open `requests/driver_api-gateway.http` in IntelliJ.
6. Run tests sequentially from top to bottom.

> **Note:** The test file first registers a driver user via the API Gateway, retrieves a JWT token, and then uses the captured userId and token for all subsequent driver profile operations. Ensure all services are running and correctly registered with Eureka.