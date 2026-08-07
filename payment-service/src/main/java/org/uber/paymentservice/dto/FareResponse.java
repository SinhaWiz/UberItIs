package org.uber.paymentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FareResponse {

    private String rideId;
    private Double distanceKm;
    private Double baseFare;
    private Double perKmRate;
    private Double fare;
}
