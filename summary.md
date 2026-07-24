# Project Session Summary

This file summarizes the current state of the Uber Clone Microservices project, the architectural decisions made, and the major bugs fixed during the previous session. **Read this file first** to pick up exactly where the last session left off.

## 1. Project Context
- **Domain:** Uber Clone (Ride-sharing application)
- **Architecture:** Microservices (Eureka, API Gateway, User, Ride, Driver, Payment, Notification)
- **Tech Stack:** Java 21, Spring Boot 4.0.7, Spring Cloud 2025.1.1, MongoDB Atlas
- **Key Principle:** Follow the High-Level Design report (`docs/report.md`) strictly.

## 2. What Has Been Implemented So Far

### ✅ Eureka Server (`eureka-server` - port 8761)
- **Status:** Fully functional.
- **Fixes Applied:** Added missing `@EnableEurekaServer` annotation and `spring-boot-starter-validation` dependency which were preventing it from booting up correctly.

### ✅ User Service (`user-service` - port 8081)
- **Status:** Fully implemented and functional.
- **Features:** Entity models, Repository, DTOs, Exception handling (GlobalExceptionHandler), and Controller logic.
- **Authentication:** The `user-service` is fully responsible for generating real, cryptographically signed JWT tokens on login/registration using `jjwt`. 

### ✅ API Gateway (`api-gateway` - port 8080)
- **Status:** Fully implemented and functional.
- **Fixes Applied:** The initial gateway codebase provided by a teammate was broken and used deprecated Netflix Zuul. It was completely deleted and rewritten using **Spring Cloud Gateway WebFlux**. 
- **Features:** 
  - Routes traffic to downstream microservices using Eureka service discovery (`lb://USER-SERVICE`).
  - Acts as the global security enforcement point. Uses a `GlobalFilter` (`AuthenticationFilter.java`) to intercept incoming requests, validate the JWT mathematically, and extract the user's `ID` and `Role`, passing them downstream as `X-Auth-User-Id` and `X-Auth-User-Role` headers.
  - Open endpoints (like login/register) bypass the filter via `RouterValidator.java`.

### ✅ Driver Service (`driver-service` - port 8083)
- **Status:** Fully implemented and functional.
- **Features:** Entity models, Repository, DTOs, Exception handling, and Controller logic. Manages driver profiles, location tracking, and availability status.

## 3. Key Architectural Decisions
1. **Dropped the Auth-Service:** The original plan listed an independent Authentication Service. This was intentionally dropped. To avoid severe distributed complexity (eventual consistency and data sync between User DB and Auth DB), the **User Service** now handles JWT generation directly. 
2. **Environment Variables:** All services use a centralized `.env` file at the root. The `application.yml` files import this using `spring.config.import: optional:file:.env[.properties]`.
3. **Gateway Routing:** The Gateway uses Spring Cloud LoadBalancer. Routes in `application.yml` **must use uppercase service names** (e.g., `lb://USER-SERVICE`) because Eureka registers service names in uppercase by default.

## 4. Important Gotchas to Remember
- **Spring Cloud 2025 Gateway:** Uses `spring-cloud-starter-gateway-server-webflux` (not the old starter).
- **Load Balancing:** Spring Cloud Gateway requires `spring-cloud-starter-loadbalancer` to resolve `lb://` URIs since Ribbon is deprecated.
- **Eureka Sync Delay:** When starting the API Gateway, you **must wait ~30 seconds** before sending a request. If you don't wait for the gateway to fetch the registry from Eureka, it will throw a `503 Service Unavailable`.
- **Testing:** Do not test microservices directly on their raw ports if they are secured. Use `requests/api-gateway.http` to test the full end-to-end flow (Port 8080) so the Gateway can validate and inject the required security headers.

## 5. Next Steps for New Sessions
The infrastructure (Eureka, Gateway) and Identity management (User Service) are rock solid, and the Driver domain is now handled.

The immediate next steps are to implement the remaining business microservices using the established clean structural template:
1. **Ride Service** (Ride requests, matching, status updates)
2. **Payment Service**
3. **Notification Service**

> **Note to Agents:** Before starting a new microservice, review `AGENTS.md` at the project root for strict coding conventions, implementation order, and how to handle inter-service placeholder stubs.
