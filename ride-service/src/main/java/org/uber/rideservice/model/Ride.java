package org.uber.rideservice.model;

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
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "rides")
public class Ride {

    @Id
    private String id;

    @Indexed
    private String riderId;

    @Indexed
    private String driverId;

    private String pickupLocation;

    private String dropoffLocation;

    private Double pickupLat;
    private Double pickupLng;
    private Double dropoffLat;
    private Double dropoffLng;

    private String pendingDriverId;

    @Builder.Default
    private List<String> rejectedDriverIds = new java.util.ArrayList<>();

    @Builder.Default
    private RideStatus status = RideStatus.REQUESTED;

    @Builder.Default
    private Double fareEstimate = 0.0;

    private Double finalFare;

    @CreatedDate
    private LocalDateTime requestedAt;

    private LocalDateTime matchedAt;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
