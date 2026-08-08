package org.uber.paymentservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
public class Payment {

    @Id
    private String id;

    @Indexed(unique = true)
    private String rideId;

    @Indexed
    private String riderId;

    @Indexed
    private String driverId;

    private Double amount;

    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Builder.Default
    private String paymentMethod = "CASH";

    @CreatedDate
    private LocalDateTime createdAt;

    private String stripePaymentIntentId;

    private LocalDateTime completedAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}