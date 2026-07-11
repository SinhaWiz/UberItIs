# API Gateway — Implementation Documentation

## Overview
The API Gateway (port `8080`) serves as the single entry point for all client requests. It routes traffic to the appropriate downstream microservices (User, Ride, Driver, Payment, Notification) using Spring Cloud Gateway (WebFlux). It also acts as a global security enforcement point, intercepting requests to validate JWTs before forwarding them to the protected services.

## What Was Implemented (and Fixed)

The initial implementation provided in `api-gateway/src/main/java/.../com` was completely rewritten due to being fundamentally broken:
1. It used **Zuul**, which is deprecated and entirely removed from Spring Cloud 2025.
2. It lacked the necessary `jjwt` dependencies in `pom.xml`.
3. The Java package names did not match the physical folder structure.

The new implementation natively uses **Spring Cloud Gateway (WebFlux)** and is fully functional.

### Key Components

#### 1. Routing Configuration (`application.yml`)
Routes are configured in the `application.yml` file under `spring.cloud.gateway.server.webflux.routes`. 
The gateway uses `lb://<service-name>` URIs to load-balance requests across instances registered with Eureka.

#### 2. Global Authentication Filter (`AuthenticationFilter.java`)
A `GlobalFilter` that runs on **every** incoming request.
- It checks the `RouterValidator` to see if the requested path is secured.
- If secured, it extracts the `Authorization: Bearer <token>` header.
- It validates the JWT signature and expiration using `JwtUtil`.
- If valid, it extracts the user's `id` and `role` from the token and injects them as **safe headers** (`X-Auth-User-Id` and `X-Auth-User-Role`) before forwarding the request to the microservices. This means the downstream services don't need to parse the JWT themselves—they just trust the headers added by the Gateway.

#### 3. Route Validator (`RouterValidator.java`)
Defines the `openApiEndpoints` list that bypasses JWT validation.
Currently open endpoints:
- `/api/users/register`
- `/api/users/login`

#### 4. JWT Utility (`JwtUtil.java`)
Handles parsing and validating the JSON Web Token using the `jjwt` library. The signing key is injected from `application.yml`.

### Architecture (Package Structure)
```
org.uber.apigateway
├── ApiGatewayApplication.java         # Spring Boot entry point
├── filter/
│   └── AuthenticationFilter.java      # Global JWT validation filter
└── util/
    ├── JwtUtil.java                   # Token parser
    └── RouterValidator.java           # Open endpoints configuration
```

## What Remains / Stubs

| Item | Status | Notes |
|------|--------|-------|
| Rate Limiting | **Not implemented** | Could be added using Spring Cloud Gateway's `RequestRateLimiter` and Redis. |
| CORS Configuration | **Not implemented** | If a frontend (React/Angular) is added, global CORS must be configured here. |

## How to Test
1. Start the `eureka-server`.
2. Start the `user-service`.
3. Start the `api-gateway`.
4. Send a login request to `http://localhost:8080/api/users/login` to get a real JWT.
5. Send requests to secured endpoints like `http://localhost:8080/api/users` with the `Authorization: Bearer <token>` header. The gateway will validate the signature and forward it.
