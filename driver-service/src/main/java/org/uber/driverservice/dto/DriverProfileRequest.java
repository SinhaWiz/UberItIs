package org.uber.driverservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverProfileRequest {

    private String userId;
    private String vehicleModel;
    private String vehiclePlate;
    private String vehicleColor;
}