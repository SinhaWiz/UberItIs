package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.RideStatusChangedEvent;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.model.RideStatus;
import org.uber.notificationservice.service.NotificationService;

@Component
@RequiredArgsConstructor
public class RideStatusEventListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.RIDE_STATUS_QUEUE)
    public void handleRideStatusChanged(RideStatusChangedEvent event) {
        NotificationType type = toNotificationType(event.getStatus());

        notificationService.createNotification(event.getRiderId(), type, event.getMessage());

        if (event.getDriverId() != null) {
            notificationService.createNotification(event.getDriverId(), type, event.getMessage());
        }
    }

    private NotificationType toNotificationType(RideStatus status) {
        return switch (status) {
            case REQUESTED -> NotificationType.RIDE_REQUESTED;
            case MATCHED -> NotificationType.RIDE_MATCHED;
            case IN_PROGRESS -> NotificationType.RIDE_STARTED;
            case COMPLETED -> NotificationType.RIDE_COMPLETED;
            case CANCELLED -> NotificationType.RIDE_CANCELLED;
        };
    }
}
