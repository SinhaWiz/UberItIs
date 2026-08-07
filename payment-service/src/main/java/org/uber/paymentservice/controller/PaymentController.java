package org.uber.paymentservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.uber.paymentservice.dto.FareResponse;
import org.uber.paymentservice.dto.PaymentCalculateRequest;
import org.uber.paymentservice.dto.PaymentProcessRequest;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.service.PaymentService;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/calculate")
    public ResponseEntity<FareResponse> calculateFare(@RequestBody(required = false) PaymentCalculateRequest request) {
        FareResponse fare = paymentService.calculateFare(request);
        return ResponseEntity.ok(fare);
    }

    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> processPayment(@RequestBody PaymentProcessRequest request) {
        PaymentResponse payment = paymentService.processPayment(request);
        return new ResponseEntity<>(payment, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable String id) {
        PaymentResponse payment = paymentService.getPayment(id);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<PaymentResponse> getPaymentByRide(@PathVariable String rideId) {
        PaymentResponse payment = paymentService.getPaymentByRide(rideId);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/rider/{riderId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentsByRider(@PathVariable String riderId) {
        List<PaymentResponse> payments = paymentService.getPaymentsByRider(riderId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentsByDriver(@PathVariable String driverId) {
        List<PaymentResponse> payments = paymentService.getPaymentsByDriver(driverId);
        return ResponseEntity.ok(payments);
    }
}
