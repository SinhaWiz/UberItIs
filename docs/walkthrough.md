# Walkthrough — Uber Ride-Sharing HLD Report

## What Was Done

Created a comprehensive High-Level Design (HLD) project report for a ride-sharing app (Uber clone) at [report.md](file:///d:/sem-6-materials/sda_project_report/report.md).

## Report Structure (8 Sections, ~990 lines)

| Section | Content |
|---------|---------|
| **1. Introduction** | Project idea, motivation, and why ride-sharing is ideal for microservices |
| **2. Project Description** | Scope table (in/out), key features for Rider/Driver/Admin, target users |
| **3. Actors & Use Cases** | 3 primary actors + 1 secondary (System), 25 use cases, Mermaid use case diagram |
| **4. Microservices Inventory** | 15 services cataloged for a real-world system, with justification for each being a separate microservice |
| **5. Chosen Services** | 5 business services + 2 infrastructure services selected for implementation, with data models, REST API endpoints, and inter-service communication details |
| **6. Architecture Diagram** | Mermaid diagram showing all layers (Client → Gateway → Services → DB/MQ), architecture patterns table |
| **7. Data Flow** | Communication map table, 3 Mermaid sequence diagrams (Ride Request, Ride Completion + Payment, Notification Processing), RabbitMQ config summary |
| **8. Tech Stack** | Technology summary with versions, Spring Boot dependencies, justifications, project folder structure, and startup order |

## Key Design Decisions

1. **5 business services** (User, Ride, Driver, Payment, Notification) — sweet spot for 4 undergrads in 3-4 weeks
2. **Both REST and RabbitMQ** — synchronous for data queries, asynchronous for notifications (professor will appreciate RabbitMQ usage)
3. **Database-per-service** — each service has its own MongoDB database for data isolation
4. **Simulated payment** — fare calculation is real; payment gateway integration is simulated
5. **Postman for testing** — no frontend; all testing via REST client

## Diagrams Created (Mermaid.js)

- Use Case Diagram (graph LR)
- System Architecture Diagram (graph TB)
- Sequence Diagram: Ride Request & Driver Matching
- Sequence Diagram: Ride Completion & Payment
- Sequence Diagram: Notification Processing (Async)

## Implementation Progress (Current Status)

### Infrastructure Setup
- **Eureka Server:** Registered on port `8761`. Added custom listener for connection logging.
- **API Gateway:** Configured on port `8080`. Routes correctly set up for all services using WebFlux.

### Business Services
- **User Service (`8081`):** Fully implemented. Handles JWT authentication, registration, and user profiles. Uses MongoDB database `uber_user_db`.
- **Driver Service (`8083`):** Fully implemented. Manages driver profiles, location, and availability. Communicates synchronously with User Service using a `@LoadBalanced` `RestTemplate`. Uses MongoDB database `uber_driver_db`.
- **Ride Service (`8082`):** Skeleton created. Pending implementation.
- **Payment Service (`8084`):** Skeleton created. Pending implementation.
- **Notification Service (`8085`):** Skeleton created. Pending implementation.

### Testing & Validation
- Standardized IntelliJ HTTP Client files created in `./requests/`.
- Both direct-service (`[service].http`) and gateway-routed (`[service]_api-gateway.http`) scripts exist and successfully pass all endpoints for User and Driver services.
