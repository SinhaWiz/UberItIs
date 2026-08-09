package org.uber.driverservice.model;

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
@Document(collection = "driver_profiles")
public class DriverProfile {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private String vehicleModel;

    @Indexed(unique = true)
    private String vehiclePlate;

    private String vehicleColor;

    @Builder.Default
    private Boolean isAvailable = true;

    @Builder.Default
    private Double currentLatitude = 0.0;

    @Builder.Default
    private Double currentLongitude = 0.0;

    @Builder.Default
    private Integer totalRides = 0;

    @Builder.Default
    private Double rating = 0.0;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}