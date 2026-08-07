package org.uber.paymentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentProcessRequest {

    private String rideId;
    private String riderId;
    private String driverId;
    private String paymentMethod;
}
