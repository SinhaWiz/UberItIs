# SDA Uber Platform

Backend-first Spring Boot platform for a ride-hailing product.

## Vision

This repository is intended to grow into a microservices-based backend that supports both passenger-side and driver-side experiences.

## Planned architecture

- Passenger-facing services for booking, trip tracking, profile management, and payments
- Driver-facing services for availability, trip acceptance, earnings, and document management
- Shared backend services for authentication, notifications, dispatching, and trip orchestration
- Multiple databases where it makes sense for service isolation and workload fit
- Docker-based local development and Kubernetes-ready deployment targets
- Google OAuth for user authentication and account linking

## Tech direction

- Java 17
- Spring Boot
- Spring Web, Validation, Actuator
- Maven
- Container-first deployment with Docker and Kubernetes in mind

## Project status

The codebase is currently a clean starter scaffold. The next step is to split the platform into focused services such as:

- `auth-service`
- `passenger-service`
- `driver-service`
- `trip-service`
- `notification-service`

## Local development

```bash
mvn spring-boot:run
```

If Maven is not available yet, install it locally or generate a Maven wrapper for the repo.

## Notes

- The repository is intentionally backend-focused.
- Frontend applications can be added later without changing the core backend architecture.
- Database choices can be made per service instead of forcing one database for the entire platform.
