package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Local copy of ride-service's event contract. Not a shared JAR — each service treats
 * this as its own contract, consistent with the rest of this system's ID-only,
 * no-shared-entity convention. status is a String (not RideStatus) so this service
 * takes no compile-time dependency on ride-service's internal enum type.
 */
@Data
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
