package org.uber.apigateway.filter;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.uber.apigateway.util.JwtUtil;
import org.uber.apigateway.util.RouterValidator;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private final RouterValidator routerValidator;
    private final JwtUtil jwtUtil;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        if (routerValidator.isSecured.test(request)) {
            if (this.isAuthMissing(request))
                return this.onError(exchange, "Authorization header is missing in request", HttpStatus.UNAUTHORIZED);

            final String token = this.getAuthHeader(request);

            if (token == null || token.isEmpty()) {
                return this.onError(exchange, "Authorization header format must be Bearer {token}", HttpStatus.UNAUTHORIZED);
            }

            try {
                if (jwtUtil.isInvalid(token)) {
                    return this.onError(exchange, "Authorization token is invalid or expired", HttpStatus.UNAUTHORIZED);
                }
            } catch (Exception e) {
                return this.onError(exchange, "Error processing token", HttpStatus.UNAUTHORIZED);
            }

            exchange = this.populateRequestWithHeaders(exchange, token);
        }
        return chain.filter(exchange);
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        return response.setComplete();
    }

    private String getAuthHeader(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private boolean isAuthMissing(ServerHttpRequest request) {
        return request.getHeaders().getFirst("Authorization") == null;
    }

    private ServerWebExchange populateRequestWithHeaders(ServerWebExchange exchange, String token) {
        Claims claims = jwtUtil.getAllClaimsFromToken(token);
        
        // Ensure id and role are passed safely if they exist in the JWT
        ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                .header("X-Auth-User-Id", claims.getSubject() != null ? claims.getSubject() : "")
                .header("X-Auth-User-Role", claims.get("role") != null ? String.valueOf(claims.get("role")) : "")
                .build();
                
        return exchange.mutate().request(modifiedRequest).build();
    }

    @Override
    public int getOrder() {
        return -1; // Execute this filter early in the chain
    }
}
