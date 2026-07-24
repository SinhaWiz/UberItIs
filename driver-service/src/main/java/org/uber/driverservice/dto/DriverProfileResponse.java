package org.uber.driverservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverProfileResponse {

    private String id;
    private String userId;
    private String vehicleModel;
    private String vehiclePlate;
    private String vehicleColor;
    private Boolean isAvailable;
    private Double currentLatitude;
    private Double currentLongitude;
    private Integer totalRides;
    private Double rating;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}