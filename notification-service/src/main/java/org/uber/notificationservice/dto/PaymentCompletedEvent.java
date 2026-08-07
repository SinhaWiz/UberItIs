package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Local copy of payment-service's event contract — see RideStatusChangedEvent for why
 * this is an independent class rather than a shared dependency.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent {

    private String paymentId;
    private String rideId;
    private String riderId;
    private String driverId;
    private Double amount;
    private String status;
    private LocalDateTime timestamp;
}
