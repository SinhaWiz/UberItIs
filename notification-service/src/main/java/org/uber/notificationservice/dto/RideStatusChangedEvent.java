package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Mirrors the RideStatusChangedEvent published by ride-service.
 * The status field is a String here (not an enum) so deserialization
 * does not depend on ride-service's RideStatus enum being on the classpath.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideStatusChangedEvent {

    private String rideId;
    private String riderId;
    private String driverId;
    private String status;
    private String message;
    private LocalDateTime timestamp;
}
