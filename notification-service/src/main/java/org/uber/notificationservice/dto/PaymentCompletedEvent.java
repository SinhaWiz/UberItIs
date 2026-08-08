package org.uber.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.uber.notificationservice.model.PaymentStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent {

    private String paymentId;
    private String riderId;
    private Double amount;
    private PaymentStatus status;
    private LocalDateTime timestamp;
}
