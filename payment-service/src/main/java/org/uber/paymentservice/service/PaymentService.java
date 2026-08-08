package org.uber.paymentservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.uber.paymentservice.dto.ProcessPaymentRequest;
import org.uber.paymentservice.dto.CalculateFareRequest;
import org.uber.paymentservice.dto.PaymentCompletedEvent;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.exception.ResourceNotFoundException;
import org.uber.paymentservice.config.RabbitMQConfig;
import org.uber.paymentservice.model.Payment;
import org.uber.paymentservice.model.PaymentStatus;
import org.uber.paymentservice.repository.PaymentRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final double BASE_FARE = 50.0;
    private static final double PER_KM_RATE = 15.0;

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;

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
     * Creates or updates a payment for a completed ride using the report's simplified fare formula.
     */
    public PaymentResponse processPayment(ProcessPaymentRequest request) {
        if (request.getDistance() == null) {
            throw new IllegalArgumentException("Distance is required");
        }

        if (request.getDistance() < 0) {
            throw new IllegalArgumentException("Distance cannot be negative");
        }

        double amount = calculateFare(CalculateFareRequest.builder()
                .rideId(request.getRideId())
                .riderId(request.getRiderId())
                .driverId(request.getDriverId())
                .distance(request.getDistance())
                .build());

        Payment payment = paymentRepository.findByRideId(request.getRideId())
                .orElseGet(Payment::new);

        payment.setRideId(request.getRideId());
        payment.setRiderId(request.getRiderId());
        payment.setDriverId(request.getDriverId());
        payment.setAmount(amount);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaymentMethod("CASH");
        payment.setCompletedAt(LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);
        publishPaymentCompleted(savedPayment);
        return toResponse(savedPayment);
    }

    /**
     * Returns a payment record by its MongoDB id.
     */
    public PaymentResponse getPayment(String id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));

        return toResponse(payment);
    }

    /**
     * Returns a payment record by its associated ride id.
     */
    public PaymentResponse getPaymentByRideId(String rideId) {
        Payment payment = paymentRepository.findByRideId(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for rideId: " + rideId));

        return toResponse(payment);
    }

    /**
     * Returns all payment records for a rider.
     */
    public List<PaymentResponse> getPaymentsByRiderId(String riderId) {
        return paymentRepository.findByRiderId(riderId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns all payment records for a driver.
     */
    public List<PaymentResponse> getPaymentsByDriverId(String driverId) {
        return paymentRepository.findByDriverId(driverId).stream()
                .map(this::toResponse)
                .toList();
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

    private void publishPaymentCompleted(Payment payment) {
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                .paymentId(payment.getId())
                .riderId(payment.getRiderId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .timestamp(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PAYMENT_COMPLETED_ROUTING_KEY, event);
    }
}