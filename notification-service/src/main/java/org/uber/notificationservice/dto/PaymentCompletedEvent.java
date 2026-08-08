package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Mirrors the PaymentCompletedEvent published by payment-service.
 * The status field is a String here to avoid cross-service enum coupling.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent {

    private String paymentId;
    private String riderId;
    private String driverId;
    private Double amount;
    private String status;
    private LocalDateTime timestamp;
}
