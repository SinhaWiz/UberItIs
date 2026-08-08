package org.uber.rideservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.uber.rideservice.config.RabbitMQConfig;
import org.uber.rideservice.dto.MatchDriverRequest;
import org.uber.rideservice.dto.RideRequest;
import org.uber.rideservice.dto.RideResponse;
import org.uber.rideservice.dto.RideStatusChangedEvent;
import org.uber.rideservice.exception.InvalidStateException;
import org.uber.rideservice.exception.ResourceNotFoundException;
import org.uber.rideservice.model.Ride;
import org.uber.rideservice.model.RideStatus;
import org.uber.rideservice.repository.RideRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final RestTemplate restTemplate;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Creates a new ride request after validating that the rider exists in the User Service.
     * Fare estimate is a flat placeholder until Payment Service owns real fare calculation.
     */
    public RideResponse requestRide(RideRequest request) {
        validateUserExists(request.getRiderId());

        Ride ride = Ride.builder()
                .riderId(request.getRiderId())
                .pickupLocation(request.getPickupLocation())
                .dropoffLocation(request.getDropoffLocation())
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .dropoffLat(request.getDropoffLat())
                .dropoffLng(request.getDropoffLng())
                .status(RideStatus.REQUESTED)
                .build();

        ride.setFareEstimate(calculateFare(ride));

        Ride savedRide = rideRepository.save(ride);
        publishRideStatusChanged(savedRide, "Ride requested");
        return toResponse(savedRide);
    }

    /**
     * Retrieves a ride by its id.
     */
    public RideResponse getRide(String id) {
        Ride ride = findRideOrThrow(id);
        return toResponse(ride);
    }

    /**
     * Matches an available driver to a REQUESTED ride and reserves the driver's availability.
     * Uses driver-service's nearby-search when pickup coordinates are available on the request,
     * otherwise falls back to the plain available-drivers list. An explicit driverId in the
     * request takes precedence over automatic selection.
     */
    public RideResponse matchDriver(String id, MatchDriverRequest request) {
        Ride ride = findRideOrThrow(id);
        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new InvalidStateException("Ride " + id + " cannot be matched from status " + ride.getStatus());
        }

        String driverId = request != null ? request.getDriverId() : null;
        if (driverId == null) {
            driverId = selectAvailableDriver(ride);
        }

        setDriverAvailability(driverId, false);

        ride.setDriverId(driverId);
        ride.setStatus(RideStatus.MATCHED);
        ride.setMatchedAt(LocalDateTime.now());

        Ride updatedRide = rideRepository.save(ride);
        publishRideStatusChanged(updatedRide, "Driver matched");
        return toResponse(updatedRide);
    }

    /**
     * Marks a MATCHED ride as IN_PROGRESS (driver has picked up the rider).
     */
    public RideResponse startRide(String id) {
        Ride ride = findRideOrThrow(id);
        if (ride.getStatus() != RideStatus.MATCHED) {
            throw new InvalidStateException("Ride " + id + " cannot be started from status " + ride.getStatus());
        }

        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now());

        Ride updatedRide = rideRepository.save(ride);
        publishRideStatusChanged(updatedRide, "Ride started");
        return toResponse(updatedRide);
    }

    /**
     * Completes an IN_PROGRESS ride, triggers payment processing, and frees the driver.
     */
    public RideResponse completeRide(String id) {
        Ride ride = findRideOrThrow(id);
        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new InvalidStateException("Ride " + id + " cannot be completed from status " + ride.getStatus());
        }

        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());
        ride.setFinalFare(processPayment(ride));

        if (ride.getDriverId() != null) {
            setDriverAvailability(ride.getDriverId(), true);
        }

        Ride updatedRide = rideRepository.save(ride);
        publishRideStatusChanged(updatedRide, "Ride completed");
        return toResponse(updatedRide);
    }

    /**
     * Cancels a ride that hasn't already reached a terminal state, releasing any matched driver.
     */
    public RideResponse cancelRide(String id) {
        Ride ride = findRideOrThrow(id);
        if (ride.getStatus() == RideStatus.COMPLETED || ride.getStatus() == RideStatus.CANCELLED) {
            throw new InvalidStateException("Ride " + id + " cannot be cancelled from status " + ride.getStatus());
        }

        if (ride.getDriverId() != null) {
            setDriverAvailability(ride.getDriverId(), true);
        }

        ride.setStatus(RideStatus.CANCELLED);

        Ride updatedRide = rideRepository.save(ride);
        publishRideStatusChanged(updatedRide, "Ride cancelled");
        return toResponse(updatedRide);
    }

    /**
     * Returns the ride history for a rider.
     */
    public List<RideResponse> getRidesByRider(String riderId) {
        return rideRepository.findByRiderId(riderId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns the ride history for a driver.
     */
    public List<RideResponse> getRidesByDriver(String driverId) {
        return rideRepository.findByDriverId(driverId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns all rides that are currently in an active (non-terminal) state.
     */
    public List<RideResponse> getActiveRides() {
        return rideRepository.findByStatusIn(List.of(RideStatus.REQUESTED, RideStatus.MATCHED, RideStatus.IN_PROGRESS))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Validates that a user exists in the User Service by calling its REST endpoint.
     */
    private void validateUserExists(String userId) {
        try {
            restTemplate.getForEntity(
                    "http://user-service/api/users/{id}",
                    Map.class,
                    userId
            );
        } catch (Exception e) {
            throw new ResourceNotFoundException("User not found with id: " + userId + " - Details: " + e.getMessage());
        }
    }

    /**
     * Selects an available driver from the Driver Service. Uses the nearby-search endpoint when
     * pickup coordinates are present on the match request, otherwise falls back to the plain
     * available-drivers list and picks the first entry.
     */
    @SuppressWarnings("unchecked")
    private String selectAvailableDriver(Ride ride) {
        List<Map<String, Object>> drivers;
        try {
            if (ride.getPickupLat() != null && ride.getPickupLng() != null) {
                // Default search radius is 5.0km
                String url = String.format("http://driver-service/api/drivers/nearby?lat=%s&lng=%s&radius=5.0", 
                        ride.getPickupLat(), ride.getPickupLng());
                drivers = restTemplate.getForObject(url, List.class);
            } else {
                drivers = restTemplate.getForObject("http://driver-service/api/drivers/available", List.class);
            }
        } catch (Exception e) {
            throw new ResourceNotFoundException("Failed to reach driver-service to find an available driver: " + e.getMessage());
        }

        if (drivers == null || drivers.isEmpty()) {
            throw new ResourceNotFoundException("No available drivers found nearby");
        }

        return (String) drivers.get(0).get("userId");
    }

    /**
     * Updates a driver's availability status in the Driver Service.
     */
    private void setDriverAvailability(String driverId, boolean isAvailable) {
        try {
            restTemplate.exchange(
                    "http://driver-service/api/drivers/{userId}/availability",
                    HttpMethod.PUT,
                    new HttpEntity<>(Map.of("isAvailable", isAvailable)),
                    Map.class,
                    driverId
            );
        } catch (Exception e) {
            throw new ResourceNotFoundException("Failed to update availability for driver " + driverId + ": " + e.getMessage());
        }
    }

    /**
     * Calls Payment Service to calculate the final distance-based fare for the completed ride.
     * Target: POST http://payment-service/api/payments/calculate
     */
    private Double processPayment(Ride ride) {
        return calculateFare(ride);
    }

    /**
     * Helper to call payment-service for fare calculations based on coordinates.
     */
    private Double calculateFare(Ride ride) {
        if (ride.getPickupLat() == null || ride.getPickupLng() == null ||
            ride.getDropoffLat() == null || ride.getDropoffLng() == null) {
            return 200.0; // fallback base fare if no coordinates
        }
        
        try {
            Map<String, Object> request = Map.of(
                    "pickupLat", ride.getPickupLat(),
                    "pickupLng", ride.getPickupLng(),
                    "dropoffLat", ride.getDropoffLat(),
                    "dropoffLng", ride.getDropoffLng()
            );
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    "http://payment-service/api/payments/calculate",
                    request,
                    Map.class
            );
            
            if (response != null && response.get("amount") != null) {
                return ((Number) response.get("amount")).doubleValue();
            }
        } catch (Exception e) {
            System.err.println("Failed to reach payment-service for fare calculation: " + e.getMessage());
        }
        return 200.0; // fallback
    }

    /**
     * Publishes a ride.status.changed event to RabbitMQ for the Notification Service to consume.
     */
    private void publishRideStatusChanged(Ride ride, String message) {
        RideStatusChangedEvent event = RideStatusChangedEvent.builder()
                .rideId(ride.getId())
                .riderId(ride.getRiderId())
                .driverId(ride.getDriverId())
                .status(ride.getStatus())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.RIDE_STATUS_ROUTING_KEY, event);
    }

    /**
     * Loads a ride by id or throws a ResourceNotFoundException.
     */
    private Ride findRideOrThrow(String id) {
        return rideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found with id: " + id));
    }

    /**
     * Maps a Ride entity to a RideResponse DTO.
     */
    private RideResponse toResponse(Ride ride) {
        return RideResponse.builder()
                .id(ride.getId())
                .riderId(ride.getRiderId())
                .driverId(ride.getDriverId())
                .pickupLocation(ride.getPickupLocation())
                .dropoffLocation(ride.getDropoffLocation())
                .pickupLat(ride.getPickupLat())
                .pickupLng(ride.getPickupLng())
                .dropoffLat(ride.getDropoffLat())
                .dropoffLng(ride.getDropoffLng())
                .status(ride.getStatus())
                .fareEstimate(ride.getFareEstimate())
                .finalFare(ride.getFinalFare())
                .requestedAt(ride.getRequestedAt())
                .matchedAt(ride.getMatchedAt())
                .startedAt(ride.getStartedAt())
                .completedAt(ride.getCompletedAt())
                .build();
    }
}
