package org.uber.driverservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.uber.driverservice.dto.*;
import org.uber.driverservice.exception.DuplicateResourceException;
import org.uber.driverservice.exception.ResourceNotFoundException;
import org.uber.driverservice.model.DriverProfile;
import org.uber.driverservice.repository.DriverProfileRepository;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverProfileRepository driverProfileRepository;
    private final RestTemplate restTemplate;

    /**
     * Creates a new driver profile after validating that the user exists in the User Service.
     * Ensures no duplicate profile exists for the same userId.
     */
    public DriverProfileResponse createProfile(DriverProfileRequest request) {
        validateUserExists(request.getUserId());

        if (driverProfileRepository.existsByUserId(request.getUserId())) {
            throw new DuplicateResourceException(
                    "Driver profile already exists for userId: " + request.getUserId());
        }

        DriverProfile profile = DriverProfile.builder()
                .userId(request.getUserId())
                .vehicleModel(request.getVehicleModel())
                .vehiclePlate(request.getVehiclePlate())
                .vehicleColor(request.getVehicleColor())
                .build();

        DriverProfile savedProfile = driverProfileRepository.save(profile);
        return toResponse(savedProfile);
    }

    /**
     * Retrieves a driver profile by their associated userId.
     */
    public DriverProfileResponse getProfileByUserId(String userId) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver profile not found for userId: " + userId));
        return toResponse(profile);
    }

    /**
     * Updates an existing driver profile's vehicle information.
     * Only vehicleModel, vehiclePlate, and vehicleColor can be updated.
     */
    public DriverProfileResponse updateProfile(String userId, DriverProfileRequest request) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver profile not found for userId: " + userId));

        if (request.getVehicleModel() != null) {
            profile.setVehicleModel(request.getVehicleModel());
        }
        if (request.getVehiclePlate() != null) {
            profile.setVehiclePlate(request.getVehiclePlate());
        }
        if (request.getVehicleColor() != null) {
            profile.setVehicleColor(request.getVehicleColor());
        }

        DriverProfile updatedProfile = driverProfileRepository.save(profile);
        return toResponse(updatedProfile);
    }

    /**
     * Toggles the driver's availability status (online/offline).
     */
    public DriverProfileResponse toggleAvailability(String userId, AvailabilityRequest request) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver profile not found for userId: " + userId));

        if (request.getIsAvailable() != null) {
            profile.setIsAvailable(request.getIsAvailable());
        }

        DriverProfile updatedProfile = driverProfileRepository.save(profile);
        return toResponse(updatedProfile);
    }

    /**
     * Updates the driver's current geographic location.
     */
    public DriverProfileResponse updateLocation(String userId, LocationUpdateRequest request) {
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver profile not found for userId: " + userId));

        if (request.getLatitude() != null) {
            profile.setCurrentLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            profile.setCurrentLongitude(request.getLongitude());
        }

        DriverProfile updatedProfile = driverProfileRepository.save(profile);
        return toResponse(updatedProfile);
    }

    /**
     * Returns all drivers who are currently available (isAvailable = true).
     */
    public List<DriverProfileResponse> getAvailableDrivers() {
        return driverProfileRepository.findByIsAvailableTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns available drivers near a specified location within a given radius (in kilometers).
     * Uses a bounding-box approximation on latitude/longitude.
     */
    public List<DriverProfileResponse> getNearbyDrivers(double latitude, double longitude, double radiusKm) {
        double latDelta = radiusKm / 111.0;
        double lngDelta = radiusKm / (111.0 * Math.cos(Math.toRadians(latitude)));

        double minLat = latitude - latDelta;
        double maxLat = latitude + latDelta;
        double minLng = longitude - lngDelta;
        double maxLng = longitude + lngDelta;

        return driverProfileRepository
                .findByIsAvailableTrueAndCurrentLatitudeBetweenAndCurrentLongitudeBetween(
                        minLat, maxLat, minLng, maxLng)
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
            e.printStackTrace();
            throw new ResourceNotFoundException("User not found with id: " + userId + " - Details: " + e.getMessage());
        }
    }

    /**
     * Maps a DriverProfile entity to a DriverProfileResponse DTO.
     */
    private DriverProfileResponse toResponse(DriverProfile profile) {
        return DriverProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .vehicleModel(profile.getVehicleModel())
                .vehiclePlate(profile.getVehiclePlate())
                .vehicleColor(profile.getVehicleColor())
                .isAvailable(profile.getIsAvailable())
                .currentLatitude(profile.getCurrentLatitude())
                .currentLongitude(profile.getCurrentLongitude())
                .totalRides(profile.getTotalRides())
                .rating(profile.getRating())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}