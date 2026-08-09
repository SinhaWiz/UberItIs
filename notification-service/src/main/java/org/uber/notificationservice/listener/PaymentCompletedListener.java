package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.PaymentCompletedEvent;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.service.NotificationService;

/**
 * Consumes payment.completed events from the payment.queue.
 * Creates a notification for the rider confirming payment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentCompletedListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.PAYMENT_QUEUE)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        log.info("Received payment.completed event: paymentId={}, riderId={}, amount={}",
                event.getPaymentId(), event.getRiderId(), event.getAmount());

        if (event.getRiderId() != null) {
            String message = String.format(
                    "Payment of ৳%.2f has been completed successfully.",
                    event.getAmount() != null ? event.getAmount() : 0.0
            );
            notificationService.createNotification(
                    event.getRiderId(),
                    NotificationType.PAYMENT_COMPLETED,
                    message,
                    event.getPaymentId()
            );
            log.info("Created payment notification for rider userId={}", event.getRiderId());
        }

        if (event.getDriverId() != null) {
            String message = String.format(
                    "You have received a payment of ৳%.2f for your recent ride.",
                    event.getAmount() != null ? event.getAmount() : 0.0
            );
            notificationService.createNotification(
                    event.getDriverId(),
                    NotificationType.PAYMENT_COMPLETED,
                    message,
                    event.getPaymentId()
            );
            log.info("Created payment notification for driver userId={}", event.getDriverId());
        }
    }
}
