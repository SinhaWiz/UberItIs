package org.uber.driverservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.uber.driverservice.dto.*;
import org.uber.driverservice.service.DriverService;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("/profile")
    public ResponseEntity<DriverProfileResponse> createProfile(@RequestBody DriverProfileRequest request) {
        DriverProfileResponse profile = driverService.createProfile(request);
        return new ResponseEntity<>(profile, HttpStatus.CREATED);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<DriverProfileResponse> getProfile(@PathVariable String userId) {
        DriverProfileResponse profile = driverService.getProfileByUserId(userId);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<DriverProfileResponse> updateProfile(
            @PathVariable String userId,
            @RequestBody DriverProfileRequest request) {
        DriverProfileResponse profile = driverService.updateProfile(userId, request);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{userId}/availability")
    public ResponseEntity<DriverProfileResponse> toggleAvailability(
            @PathVariable String userId,
            @RequestBody AvailabilityRequest request) {
        DriverProfileResponse profile = driverService.toggleAvailability(userId, request);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{userId}/location")
    public ResponseEntity<DriverProfileResponse> updateLocation(
            @PathVariable String userId,
            @RequestBody LocationUpdateRequest request) {
        DriverProfileResponse profile = driverService.updateLocation(userId, request);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/available")
    public ResponseEntity<List<DriverProfileResponse>> getAvailableDrivers() {
        List<DriverProfileResponse> drivers = driverService.getAvailableDrivers();
        return ResponseEntity.ok(drivers);
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<DriverProfileResponse>> getNearbyDrivers(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5.0") double radius) {
        List<DriverProfileResponse> drivers = driverService.getNearbyDrivers(lat, lng, radius);
        return ResponseEntity.ok(drivers);
    }
}