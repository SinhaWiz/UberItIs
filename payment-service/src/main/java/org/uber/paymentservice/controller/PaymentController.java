package org.uber.paymentservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.uber.paymentservice.dto.CalculateFareRequest;
import org.uber.paymentservice.dto.CalculateFareResponse;
import org.uber.paymentservice.service.PaymentService;

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
}