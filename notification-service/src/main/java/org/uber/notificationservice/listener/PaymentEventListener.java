package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.PaymentCompletedEvent;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.service.NotificationService;

@Component
@RequiredArgsConstructor
public class PaymentEventListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.PAYMENT_QUEUE)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        String message = "Your payment of %.2f was completed successfully.".formatted(event.getAmount());
        notificationService.createNotification(event.getRiderId(), NotificationType.PAYMENT_COMPLETED, message);
    }
}
