package org.uber.rideservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
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
