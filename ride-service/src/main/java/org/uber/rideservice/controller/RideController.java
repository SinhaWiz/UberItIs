package org.uber.rideservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.uber.rideservice.dto.MatchDriverRequest;
import org.uber.rideservice.dto.RideRequest;
import org.uber.rideservice.dto.RideResponse;
import org.uber.rideservice.service.RideService;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @PostMapping("/request")
    public ResponseEntity<RideResponse> requestRide(@RequestBody RideRequest request) {
        RideResponse ride = rideService.requestRide(request);
        return new ResponseEntity<>(ride, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RideResponse> getRide(@PathVariable String id) {
        RideResponse ride = rideService.getRide(id);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/match")
    public ResponseEntity<RideResponse> matchDriver(
            @PathVariable String id,
            @RequestBody(required = false) MatchDriverRequest request) {
        RideResponse ride = rideService.matchDriver(id, request);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<RideResponse> acceptRide(
            @PathVariable String id,
            @RequestParam String driverId) {
        RideResponse ride = rideService.acceptRide(id, driverId);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<RideResponse> rejectRide(
            @PathVariable String id,
            @RequestParam String driverId) {
        RideResponse ride = rideService.rejectRide(id, driverId);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<RideResponse> startRide(@PathVariable String id) {
        RideResponse ride = rideService.startRide(id);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<RideResponse> completeRide(@PathVariable String id) {
        RideResponse ride = rideService.completeRide(id);
        return ResponseEntity.ok(ride);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<RideResponse> cancelRide(@PathVariable String id) {
        RideResponse ride = rideService.cancelRide(id);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/rider/{riderId}")
    public ResponseEntity<List<RideResponse>> getRidesByRider(@PathVariable String riderId) {
        List<RideResponse> rides = rideService.getRidesByRider(riderId);
        return ResponseEntity.ok(rides);
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<List<RideResponse>> getRidesByDriver(@PathVariable String driverId) {
        List<RideResponse> rides = rideService.getRidesByDriver(driverId);
        return ResponseEntity.ok(rides);
    }

    @GetMapping("/active")
    public ResponseEntity<List<RideResponse>> getActiveRides() {
        List<RideResponse> rides = rideService.getActiveRides();
        return ResponseEntity.ok(rides);
    }
}
