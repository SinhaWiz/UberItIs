# Uber Microservices Clone

This project is a high-level microservices-based architecture for a ride-sharing application (Uber clone), designed for the **Software Design and Architectures (SWE 4602)** course.

**Team Information:**
- Group-B, Team-X
- Tahir Zaman Umar (ID: 220042134)
- Naybur Rahman Sinha (ID: 220042128)
- Raiyan Muhtasim (ID: 220042162)
- Hasibul Karim (ID: 22004202)

## 🏗️ Architecture & Modules
The system is built using the Spring Boot framework with a Parent-Child multi-module Maven architecture. It consists of the following 7 core microservices:

1. **`eureka-server`** (Port: `8761`): Service Registry and Discovery for all microservices.
2. **`api-gateway`** (Port: `8080`): Centralized entry point handling routing and load balancing using Spring Cloud Gateway (WebFlux).
3. **`user-service`** (Port: `8081`): Manages rider profiles, authentication, and user data.
4. **`ride-service`** (Port: `8082`): Handles ride matching, status tracking, and trip management.
5. **`driver-service`** (Port: `8083`): Manages driver profiles, statuses, and location tracking.
6. **`payment-service`** (Port: `8084`): Processes ride fares and transactions.
7. **`notification-service`** (Port: `8085`): Dispatches SMS/Email/Push notifications to riders and drivers.

## 🛠️ Technology Stack
- **Backend Framework:** Java 21, Spring Boot 4.0.7
- **Microservices Framework:** Spring Cloud 2025.1.1 (Oakwood)
- **Database:** MongoDB Atlas (Cloud)
- **Message Broker:** RabbitMQ (For async event-driven communication)
- **Build Tool:** Maven (Multi-module)
- **IDE:** IntelliJ IDEA Ultimate

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Java 21** installed and configured in your environment path.
- **Maven** installed.
- **RabbitMQ** installed and running locally on port `5672` (or via Docker).
- A **MongoDB Atlas** cluster account.

### 2. Environment Variables Setup
We use a centralized `.env` file for secure credentials management.

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your actual MongoDB Atlas username and password:
   ```properties
   MONGO_DB_USER=your_actual_atlas_username
   MONGO_DB_PASS=your_actual_atlas_password
   ```
   *(Note: The `.env` file is excluded from git via `.gitignore` to protect your credentials. Spring Boot automatically loads this file thanks to the `optional:file:.env[.properties]` config).*

### 3. Build the Project
Run a global Maven build from the root directory to download dependencies and compile all 7 submodules:
```bash
mvn clean install
```

### 4. Running the Services
To boot up the system, start the applications in the following strict order from IntelliJ (or via `mvn spring-boot:run`):

1. Start `EurekaServerApplication` (Wait for it to fully boot).
2. Start `ApiGatewayApplication`.
3. Start `UserServiceApplication`, `RideServiceApplication`, `DriverServiceApplication`, `PaymentServiceApplication`, and `NotificationServiceApplication` in any order.

### 5. Testing
You can use the provided IntelliJ HTTP Client files located in the `./requests` directory (e.g., `requests/user-service.http`) to execute predefined dummy API tests directly from your IDE.

## ⚠️ Important Configuration Notes
During the initial setup, we ran into some Spring Boot 4.0 & Spring Cloud 2025 specific issues. Please keep the following in mind if you are modifying POMs or YAMLs:

1. **Spring Cloud Gateway 2025 Breaking Change:** The traditional `spring-cloud-starter-gateway` dependency has been completely renamed to `spring-cloud-starter-gateway-server-webflux`. Furthermore, all `application.yml` properties for routing are now under `spring.cloud.gateway.server.webflux...`. Do not use the old pre-2024 properties.
2. **Environment Variable Loading:** Spring Boot 2.4+ ignores `.env` files by default because it doesn't recognize the file extension. To load our `.env` natively without external libraries, we explicitly added the `[.properties]` extension hint inside our `application.yml` files (`import: optional:file:.env[.properties]`). This forces Spring Boot to parse it correctly.
3. **Parent POM Inheritance:** We strictly manage all dependency versions in the root `sda_project/pom.xml`. Do **not** add `<version>` tags to dependencies in the sub-modules (like `user-service`), to prevent version conflicts and compilation errors.

<br>

(Note: Some configuration syntax in the old setup guides may differ from the final working implementation noted above).
