# Agent Instructions — Uber Microservices Project

## 1. Before You Write Any Code

### 1.1 Understand the Project
Read these files **in order** before doing anything:

1. `./docs/report.md` — The full High-Level Design report. Contains the data models, REST API specifications, inter-service communication maps, and architecture decisions. This is the **source of truth** for what each service should do.
2. `./docs/walkthrough.md` — Summary of the report structure and key design decisions.
3. `./task.md` (if present) — The current task description with specific instructions.
4. `./docs/<service>-doc.md` (if present) — Implementation walkthroughs for services that have already been built. Read these to understand established patterns and avoid inconsistency.

### 1.2 Understand the Current State
Before implementing anything, scan the repo to understand what already exists:

- Check which services have actual code vs. bare skeletons (just an `Application.java` main class).
- Read the `pom.xml` of the service you are working on **and** the root `pom.xml` to understand dependency management.
- Read the `application.yml` of your target service to understand its port, database name, and config imports.
- Check `./requests/` for any existing `.http` test files.
- Check `./docs/` for any existing implementation docs.

### 1.3 Understand the Conventions Already Established
If other services have been implemented before yours, **follow their patterns exactly**. Specifically:

- **Package structure:** `org.uber.<servicename>` with sub-packages: `model`, `dto`, `repository`, `service`, `controller`, `exception`, `config`.
- **DTO pattern:** Never return entity objects directly from controllers. Use `*Response` DTOs that strip sensitive fields (like passwords).
- **Exception handling:** Use `ResourceNotFoundException` (404), `DuplicateResourceException` (409), and a `GlobalExceptionHandler` (`@RestControllerAdvice`) for clean JSON error responses.
- **Lombok:** Use `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` on entities and DTOs. Use `@RequiredArgsConstructor` for constructor injection in services and controllers.
- **MongoDB auditing:** Use `@CreatedDate` and `@LastModifiedDate` on timestamp fields. The `@EnableMongoAuditing` annotation is placed on a `@Configuration` class.

---

## 2. During Implementation

### 2.1 Implementation Order
Follow this order when building a service from its skeleton:

1. **Model layer** — Entity classes and enums matching the report's data model.
2. **DTOs** — Request and response objects for the controller.
3. **Repository** — `MongoRepository` interface with custom query methods.
4. **Exceptions** — Custom exception classes (reuse from other services if identical).
5. **Config** — Any `@Configuration` beans needed (e.g., `PasswordEncoder`).
6. **Service layer** — Business logic class with all operations.
7. **Controller** — REST endpoints matching the report's API table.
8. **HTTP test requests** — `.http` file in `./requests/` for IntelliJ HTTP Client.

### 2.2 Code Quality Rules
- **No unnecessary code.** Don't add features, endpoints, or abstractions not specified in the report.
- **No unnecessary complexity.** Don't introduce patterns (factories, abstract classes, interfaces for services) unless there's a concrete reason.
- **Clean and readable.** Write code that an undergraduate student can understand. Add Javadoc comments on service methods explaining what they do.
- **Consistent naming.** Follow the naming conventions already established in the codebase.

### 2.3 Inter-Service Communication
When your service needs to call another service:

- **If the target service is already implemented:** Use `RestTemplate` or `WebClient` to call it via its Eureka-registered name (e.g., `http://user-service/api/users/{id}`).
- **If the target service is NOT implemented yet:** Write a **placeholder stub** with a comprehensive comment block explaining:
  - What service it would call
  - What endpoint and HTTP method
  - What data it expects to send and receive
  - What the fallback/mock behavior is for now

Example stub pattern:
```java
/**
 * TODO: Call Driver Service to find available drivers near the pickup location.
 * 
 * Target: GET http://driver-service/api/drivers/nearby?lat={lat}&lng={lng}&radius={radius}
 * Expected response: List<DriverProfile> — available drivers sorted by distance.
 * 
 * Currently returns a mock empty list. Replace this when driver-service is implemented.
 * See report.md Section 5.3.3 for the Driver Service API spec.
 */
private List<Object> findNearbyDrivers(double lat, double lng) {
    // Stub: return empty list until driver-service is available
    return List.of();
}
```

### 2.4 RabbitMQ Events
For services that publish or consume RabbitMQ messages (ride-service, payment-service, notification-service):

- Follow the event names defined in report.md Section 7 (e.g., `ride.status.changed`, `payment.completed`).
- If RabbitMQ is not yet set up or the consuming service doesn't exist, write the publisher code with a clear comment noting the consumer side.
- Use a dedicated `config/` class for queue/exchange/binding declarations.

### 2.5 POM Dependencies
- **Never hardcode version numbers** in sub-module `pom.xml` files. All versions are managed by the root POM's `<dependencyManagement>` (Spring Boot Parent + Spring Cloud BOM).
- If you need a new dependency, add it without a `<version>` tag. If it's not managed by the parent BOM, add it to the root POM's `<dependencyManagement>` first.

### 2.6 Application Configuration
- The `application.yml` files use `spring.config.import: optional:file:.env[.properties],optional:file:../.env[.properties]` to load environment variables from the root `.env` file. **Do not change this pattern.**
- MongoDB connection uses `${MONGO_DB_USER}` and `${MONGO_DB_PASS}` placeholders. Each service has its own database name (e.g., `uber_user_db`, `uber_ride_db`).
- Eureka is configured to register at `http://localhost:8761/eureka/`.

---

## 3. After Implementation

### 3.1 Write HTTP Test Requests
Create or update `./requests/<service-name>.http` with:

- A test for **every** endpoint the service exposes.
- Both **happy path** and **error cases** (e.g., duplicate registration → 409, invalid login → 400, not found → 404).
- IntelliJ HTTP Client response handler scripts (`> {% ... %}`) that capture IDs from creation responses and reuse them in subsequent requests.
- Requests should be ordered logically so they can be run **sequentially** from top to bottom on a fresh database.

### 3.2 Write Implementation Documentation
Create `./docs/<service-name>-doc.md` containing:

1. **Overview** — What the service does in one paragraph.
2. **Data Model** — Table of fields with types and notes.
3. **REST API Endpoints** — Table with method, endpoint, description, and status codes.
4. **Package Structure** — Tree view of the Java packages.
5. **Key Design Decisions** — Why things were done a certain way.
6. **What Remains / Stubs** — Table of TODO items, placeholder stubs, and things intentionally left out.
7. **How to Test** — Step-by-step instructions.

### 3.3 Verify the Build
After all code is written, **verify the build compiles** before declaring the task done.

The project uses Maven via IntelliJ's bundled Maven. To compile from the project root:
```
mvn clean compile
```

To compile only your specific service:
```
mvn clean compile -pl <service-name>
```

> **Note:** The exact `mvn` command path varies by platform and IDE installation. On some setups, Maven is only available through IntelliJ's bundled path (check `.mvn/` or the IDE's Maven settings). `mvn` may or may not be available as direct terminal command, check.

If the build succeeds, you're done. If it fails, **read the error carefully** — common issues:
- Missing imports (forgot to add a dependency to `pom.xml`)
- Lombok not processing (IntelliJ annotation processing needs to be enabled)
- Test compilation failures (the skeleton test class may reference packages that don't exist — either fix it or skip tests with `-DskipTests`)

---

## 4. Important Project-Specific Notes

### 4.1 Spring Cloud Gateway (api-gateway)
The API Gateway uses **Spring Cloud 2025.1.1** which introduced breaking changes:
- The dependency is `spring-cloud-starter-gateway-server-webflux` (NOT `spring-cloud-starter-gateway`).
- All YAML routing properties are under `spring.cloud.gateway.server.webflux.routes` (NOT `spring.cloud.gateway.routes`).

### 4.2 Spring Security in Services
When a service uses `spring-boot-starter-security` (e.g., for `BCryptPasswordEncoder`), you **must** add a `SecurityConfig` that explicitly disables the default security filter chain. Otherwise, Spring Security will lock down all endpoints and require HTTP Basic auth:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    return http.build();
}
```

### 4.3 Environment Variables
Real credentials are stored in `.env` at the project root (git-ignored). The `.env.example` file shows the required variables. Never commit actual credentials.

### 4.4 Service Ports
| Service | Port |
|---------|------|
| Eureka Server | 8761 |
| API Gateway | 8080 |
| User Service | 8081 |
| Ride Service | 8082 |
| Driver Service | 8083 |
| Payment Service | 8084 |
| Notification Service | 8085 |

### 4.5 MongoDB Configuration Gotchas
When configuring MongoDB URIs in this project, **always provide both** `spring.data.mongodb.uri` and `spring.mongodb.uri` in the `application.yml` file to bypass auto-configuration prefix conflicts. Furthermore, **do not** use a separate `database:` property if using an SRV URI (`mongodb+srv://`). Instead, append the database name directly to the URI string (e.g., `...mongodb.net/uber_user_db?appName=cluster0`). Failure to do so will cause the driver to silently ignore the configuration and fall back to `localhost:27017`.

### 4.6 Eureka DNS and API Gateway Routing
When registering services with Eureka for the API Gateway to route to, you **must** set `eureka.instance.prefer-ip-address: true` in the `application.yml` of all services and the gateway. By default, Eureka registers services using the machine's local hostname (e.g., `Boomer.mshome.net`), which the API Gateway's internal DNS resolver will fail to resolve, resulting in an `UnknownHostException` (HTTP 500) during routing.

### 4.7 RestTemplate and LoadBalancing
Since Spring Cloud 2020.0 (which removed Netflix Ribbon), adding `@LoadBalanced` to a `RestTemplate` bean is **not enough** on its own. You **must** explicitly include the `spring-cloud-starter-loadbalancer` dependency in the service's `pom.xml`. If this dependency is missing, the code will fail to compile, or the `RestTemplate` will attempt to resolve Eureka service IDs via standard DNS, resulting in `UnknownHostException`s during inter-service communication.

