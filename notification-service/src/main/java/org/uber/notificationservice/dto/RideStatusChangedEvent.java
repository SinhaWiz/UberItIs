package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.uber.notificationservice.model.RideStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideStatusChangedEvent {

    private String rideId;
    private String riderId;
    private String driverId;
    private RideStatus status;
    private String message;
    private LocalDateTime timestamp;
}
