package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.PaymentCompletedEvent;
import org.uber.notificationservice.service.NotificationService;

@Component
@RequiredArgsConstructor
public class PaymentEventListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.PAYMENT_QUEUE)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        notificationService.handlePaymentCompleted(event);
    }
}
