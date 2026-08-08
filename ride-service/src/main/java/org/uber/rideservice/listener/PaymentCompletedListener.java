package org.uber.rideservice.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.rideservice.config.RabbitMQConfig;
import org.uber.rideservice.dto.PaymentCompletedEvent;
import org.uber.rideservice.model.Ride;
import org.uber.rideservice.repository.RideRepository;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentCompletedListener {

    private final RideRepository rideRepository;

    @RabbitListener(queues = RabbitMQConfig.RIDE_PAYMENT_QUEUE)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        log.info("Received PaymentCompletedEvent for rideId={}", event.getRideId());

        if (event.getRideId() != null) {
            rideRepository.findById(event.getRideId()).ifPresent(ride -> {
                ride.setIsPaid(true);
                rideRepository.save(ride);
                log.info("Marked rideId={} as paid", ride.getId());
            });
        }
    }
}
