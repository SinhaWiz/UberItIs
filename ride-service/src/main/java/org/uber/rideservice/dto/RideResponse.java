package org.uber.rideservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.uber.rideservice.model.RideStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideResponse {

    private String id;
    private String riderId;
    private String driverId;
    private String pendingDriverId;
    private String pickupLocation;
    private String dropoffLocation;
    private Double pickupLat;
    private Double pickupLng;
    private Double dropoffLat;
    private Double dropoffLng;
    private RideStatus status;
    private Double fareEstimate;
    private Double finalFare;
    private LocalDateTime requestedAt;
    private LocalDateTime matchedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
