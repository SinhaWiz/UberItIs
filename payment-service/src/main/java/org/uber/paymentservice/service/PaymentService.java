package org.uber.paymentservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.uber.paymentservice.dto.CalculateFareRequest;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.model.Payment;
import org.uber.paymentservice.repository.PaymentRepository;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final double BASE_FARE = 50.0;
    private static final double PER_KM_RATE = 15.0;

    private final PaymentRepository paymentRepository;

    /**
     * Calculates the ride fare using the report's simplified formula.
     */
    public Double calculateFare(CalculateFareRequest request) {
        if (request.getDistance() == null) {
            throw new IllegalArgumentException("Distance is required");
        }

        if (request.getDistance() < 0) {
            throw new IllegalArgumentException("Distance cannot be negative");
        }

        return BASE_FARE + (request.getDistance() * PER_KM_RATE);
    }

    /**
     * Returns a payment record by its MongoDB id.
     */
    public PaymentResponse getPayment(String id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));

        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .rideId(payment.getRideId())
                .riderId(payment.getRiderId())
                .driverId(payment.getDriverId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paymentMethod(payment.getPaymentMethod())
                .createdAt(payment.getCreatedAt())
                .completedAt(payment.getCompletedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}