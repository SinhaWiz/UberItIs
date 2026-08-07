package org.uber.paymentservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.uber.paymentservice.config.RabbitMQConfig;
import org.uber.paymentservice.dto.FareResponse;
import org.uber.paymentservice.dto.PaymentCalculateRequest;
import org.uber.paymentservice.dto.PaymentCompletedEvent;
import org.uber.paymentservice.dto.PaymentProcessRequest;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.exception.DuplicateResourceException;
import org.uber.paymentservice.exception.ResourceNotFoundException;
import org.uber.paymentservice.model.Payment;
import org.uber.paymentservice.model.PaymentStatus;
import org.uber.paymentservice.repository.PaymentRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final double BASE_FARE = 50.0;
    private static final double PER_KM_RATE = 15.0;
    private static final double MIN_DISTANCE_KM = 2.0;
    private static final double MAX_DISTANCE_KM = 20.0;

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Previews a fare for a ride without persisting anything. Distance is simulated —
     * there is no real GPS/mapping integration in this project, per report.md Section 5.3.4.
     */
    public FareResponse calculateFare(PaymentCalculateRequest request) {
        double distanceKm = simulateDistanceKm();
        double fare = computeFare(distanceKm);

        return FareResponse.builder()
                .rideId(request != null ? request.getRideId() : null)
                .distanceKm(distanceKm)
                .baseFare(BASE_FARE)
                .perKmRate(PER_KM_RATE)
                .fare(fare)
                .build();
    }

    /**
     * Processes payment for a completed ride, creating a Payment record. Payment processing
     * is simulated as always succeeding — there is no real payment gateway integration.
     * Rejects a second call for the same rideId to avoid double-billing on a retry.
     */
    public PaymentResponse processPayment(PaymentProcessRequest request) {
        if (paymentRepository.findByRideId(request.getRideId()).isPresent()) {
            throw new DuplicateResourceException("Payment already processed for ride: " + request.getRideId());
        }

        double distanceKm = simulateDistanceKm();
        double fare = computeFare(distanceKm);

        String paymentMethod = request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()
                ? request.getPaymentMethod() : "CASH";

        Payment payment = Payment.builder()
                .rideId(request.getRideId())
                .riderId(request.getRiderId())
                .driverId(request.getDriverId())
                .amount(fare)
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(paymentMethod)
                .completedAt(LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        publishPaymentCompleted(savedPayment);
        return toResponse(savedPayment);
    }

    /**
     * Retrieves a payment by its id.
     */
    public PaymentResponse getPayment(String id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        return toResponse(payment);
    }

    /**
     * Retrieves the payment for a specific ride.
     */
    public PaymentResponse getPaymentByRide(String rideId) {
        Payment payment = paymentRepository.findByRideId(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for ride: " + rideId));
        return toResponse(payment);
    }

    /**
     * Returns the payment history for a rider.
     */
    public List<PaymentResponse> getPaymentsByRider(String riderId) {
        return paymentRepository.findByRiderId(riderId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns the earnings history for a driver.
     */
    public List<PaymentResponse> getPaymentsByDriver(String driverId) {
        return paymentRepository.findByDriverId(driverId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Simulates a ride distance in kilometers, since there is no real GPS/mapping data.
     */
    private double simulateDistanceKm() {
        return ThreadLocalRandom.current().nextDouble(MIN_DISTANCE_KM, MAX_DISTANCE_KM);
    }

    /**
     * Applies the fare formula from report.md Section 5.3.4: baseFare + distance * perKmRate.
     */
    private double computeFare(double distanceKm) {
        return BASE_FARE + distanceKm * PER_KM_RATE;
    }

    /**
     * Publishes a payment.completed event to RabbitMQ for the Notification Service to consume.
     */
    private void publishPaymentCompleted(Payment payment) {
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                .paymentId(payment.getId())
                .rideId(payment.getRideId())
                .riderId(payment.getRiderId())
                .driverId(payment.getDriverId())
                .amount(payment.getAmount())
                .status(payment.getStatus().name())
                .timestamp(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PAYMENT_COMPLETED_ROUTING_KEY, event);
    }

    /**
     * Maps a Payment entity to a PaymentResponse DTO.
     */
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
                .build();
    }
}
