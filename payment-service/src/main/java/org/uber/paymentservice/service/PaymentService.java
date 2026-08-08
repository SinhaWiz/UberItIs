package org.uber.paymentservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.uber.paymentservice.dto.CreatePaymentIntentRequest;
import org.uber.paymentservice.dto.CreatePaymentIntentResponse;
import org.uber.paymentservice.dto.ProcessPaymentRequest;
import org.uber.paymentservice.dto.CalculateFareRequest;
import org.uber.paymentservice.dto.PaymentCompletedEvent;
import org.uber.paymentservice.dto.PaymentResponse;
import org.uber.paymentservice.exception.ResourceNotFoundException;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.uber.paymentservice.config.RabbitMQConfig;
import org.uber.paymentservice.model.Payment;
import org.uber.paymentservice.model.PaymentStatus;
import org.uber.paymentservice.repository.PaymentRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final double BASE_FARE = 200.0;
    private static final double PER_KM_RATE = 30.0;

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;
    private final RestTemplate restTemplate;

    /**
     * Calculates the ride fare using the report's simplified formula.
     */
    public Double calculateFare(CalculateFareRequest request) {
        Double distance = request.getDistance();

        if (distance == null) {
            if (request.getPickupLat() != null && request.getPickupLng() != null &&
                request.getDropoffLat() != null && request.getDropoffLng() != null) {
                distance = calculateHaversineDistance(
                        request.getPickupLat(), request.getPickupLng(),
                        request.getDropoffLat(), request.getDropoffLng()
                );
            } else {
                throw new IllegalArgumentException("Distance or coordinates are required");
            }
        }

        if (distance < 0) {
            throw new IllegalArgumentException("Distance cannot be negative");
        }

        return BASE_FARE + (distance * PER_KM_RATE);
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Creates a Stripe PaymentIntent for the given ride.
     */
    public CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request) {
        validateUserExists(request.getRiderId());
        
        Double amount = request.getFinalFare();
        
        if (amount == null) {
            try {
                Map<String, Object> ride = restTemplate.getForObject("http://ride-service/api/rides/" + request.getRideId(), Map.class);
                if (ride != null && ride.get("finalFare") != null) {
                    amount = Double.valueOf(ride.get("finalFare").toString());
                }
            } catch (Exception e) {
                // fallback if fetch fails
            }
        }

        if (amount == null) {
            amount = calculateFare(CalculateFareRequest.builder()
                    .rideId(request.getRideId())
                    .riderId(request.getRiderId())
                    .driverId(request.getDriverId())
                    .distance(request.getDistance())
                    .pickupLat(request.getPickupLat())
                    .pickupLng(request.getPickupLng())
                    .dropoffLat(request.getDropoffLat())
                    .dropoffLng(request.getDropoffLng())
                    .build());
        }

        try {
            long amountInCents = Math.round(amount * 100);
            PaymentIntentCreateParams params =
                    PaymentIntentCreateParams.builder()
                            .setAmount(amountInCents)
                            .setCurrency("bdt")
                            .putMetadata("rideId", request.getRideId())
                            .putMetadata("riderId", request.getRiderId())
                            .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            return CreatePaymentIntentResponse.builder()
                    .clientSecret(paymentIntent.getClientSecret())
                    .amount(amount)
                    .build();
        } catch (StripeException e) {
            throw new RuntimeException("Failed to create Stripe PaymentIntent: " + e.getMessage(), e);
        }
    }

    /**
     * Creates or updates a payment for a completed ride using the report's simplified fare formula.
     */
    public PaymentResponse processPayment(ProcessPaymentRequest request) {
        if (request.getDistance() != null && request.getDistance() < 0) {
            throw new IllegalArgumentException("Distance cannot be negative");
        }

        validateUserExists(request.getRiderId());
        validateUserExists(request.getDriverId());

        if (request.getPaymentIntentId() == null || request.getPaymentIntentId().isEmpty()) {
            throw new IllegalArgumentException("paymentIntentId is required");
        }

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(request.getPaymentIntentId());
            if (!"succeeded".equals(paymentIntent.getStatus())) {
                throw new IllegalArgumentException("PaymentIntent is not in succeeded state. Current status: " + paymentIntent.getStatus());
            }
        } catch (StripeException e) {
            throw new RuntimeException("Failed to verify Stripe PaymentIntent: " + e.getMessage(), e);
        }

        double amount = calculateFare(CalculateFareRequest.builder()
                .rideId(request.getRideId())
                .riderId(request.getRiderId())
                .driverId(request.getDriverId())
                .distance(request.getDistance())
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .dropoffLat(request.getDropoffLat())
                .dropoffLng(request.getDropoffLng())
                .build());

        Payment payment = paymentRepository.findByRideId(request.getRideId())
                .orElseGet(Payment::new);

        payment.setRideId(request.getRideId());
        payment.setRiderId(request.getRiderId());
        payment.setDriverId(request.getDriverId());
        payment.setAmount(amount);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaymentMethod("CARD");
        payment.setStripePaymentIntentId(request.getPaymentIntentId());
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
                .stripePaymentIntentId(payment.getStripePaymentIntentId())
                .createdAt(payment.getCreatedAt())
                .completedAt(payment.getCompletedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

    private void publishPaymentCompleted(Payment payment) {
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                .paymentId(payment.getId())
                .rideId(payment.getRideId())
                .riderId(payment.getRiderId())
                .driverId(payment.getDriverId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .timestamp(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PAYMENT_COMPLETED_ROUTING_KEY, event);
    }

    private void validateUserExists(String userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }
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
}