package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.RideStatusChangedEvent;
import org.uber.notificationservice.service.NotificationService;

@Component
@RequiredArgsConstructor
public class RideEventListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.RIDE_STATUS_QUEUE)
    public void onRideStatusChanged(RideStatusChangedEvent event) {
        notificationService.handleRideStatusChanged(event);
    }
}
