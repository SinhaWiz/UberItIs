package org.uber.paymentservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.uber.paymentservice.dto.CalculateFareRequest;
import org.uber.paymentservice.dto.CalculateFareResponse;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.dto.ProcessPaymentRequest;
import org.uber.paymentservice.service.PaymentService;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/calculate")
    public ResponseEntity<CalculateFareResponse> calculateFare(@RequestBody CalculateFareRequest request) {
        Double amount = paymentService.calculateFare(request);
        return ResponseEntity.ok(CalculateFareResponse.builder().amount(amount).build());
    }

    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> processPayment(@RequestBody ProcessPaymentRequest request) {
        PaymentResponse payment = paymentService.processPayment(request);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable String id) {
        PaymentResponse payment = paymentService.getPayment(id);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<PaymentResponse> getPaymentByRideId(@PathVariable String rideId) {
        PaymentResponse payment = paymentService.getPaymentByRideId(rideId);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/rider/{riderId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentsByRiderId(@PathVariable String riderId) {
        List<PaymentResponse> payments = paymentService.getPaymentsByRiderId(riderId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<List<PaymentResponse>> getPaymentsByDriverId(@PathVariable String driverId) {
        List<PaymentResponse> payments = paymentService.getPaymentsByDriverId(driverId);
        return ResponseEntity.ok(payments);
    }
}