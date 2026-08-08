package org.uber.notificationservice.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.uber.notificationservice.config.RabbitMQConfig;
import org.uber.notificationservice.dto.RideStatusChangedEvent;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.service.NotificationService;

/**
 * Consumes ride.status.changed events from the ride.status.queue.
 * Creates notifications for the rider and, when applicable, for the driver.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RideStatusListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMQConfig.RIDE_STATUS_QUEUE)
    public void handleRideStatusChanged(RideStatusChangedEvent event) {
        log.info("Received ride.status.changed event: rideId={}, status={}", event.getRideId(), event.getStatus());

        NotificationType type = mapStatusToType(event.getStatus());
        String riderMessage = buildRiderMessage(event);
        String driverMessage = buildDriverMessage(event);

        // Always notify the rider
        if (event.getRiderId() != null) {
            notificationService.createNotification(event.getRiderId(), type, riderMessage);
            log.info("Created rider notification for userId={}", event.getRiderId());
        }

        // Notify the driver when one is assigned (not for REQUESTED or early CANCELLED)
        if (event.getDriverId() != null) {
            notificationService.createNotification(event.getDriverId(), type, driverMessage);
            log.info("Created driver notification for userId={}", event.getDriverId());
        }
    }

    private NotificationType mapStatusToType(String status) {
        return switch (status) {
            case "REQUESTED" -> NotificationType.RIDE_REQUESTED;
            case "MATCHED" -> NotificationType.RIDE_MATCHED;
            case "IN_PROGRESS" -> NotificationType.RIDE_STARTED;
            case "COMPLETED" -> NotificationType.RIDE_COMPLETED;
            case "CANCELLED" -> NotificationType.RIDE_CANCELLED;
            default -> NotificationType.RIDE_REQUESTED;
        };
    }

    private String buildRiderMessage(RideStatusChangedEvent event) {
        return switch (event.getStatus()) {
            case "REQUESTED" -> "Your ride has been requested. Looking for a nearby driver...";
            case "MATCHED" -> "A driver has been matched to your ride!";
            case "IN_PROGRESS" -> "Your ride has started. Enjoy the trip!";
            case "COMPLETED" -> "Your ride is complete. Please proceed with payment.";
            case "CANCELLED" -> "Your ride has been cancelled.";
            default -> event.getMessage();
        };
    }

    private String buildDriverMessage(RideStatusChangedEvent event) {
        return switch (event.getStatus()) {
            case "MATCHED" -> "You have been matched to a new ride. Head to the pickup location.";
            case "IN_PROGRESS" -> "The ride is now in progress.";
            case "COMPLETED" -> "The ride is complete. Awaiting payment confirmation.";
            case "CANCELLED" -> "The ride has been cancelled.";
            default -> event.getMessage();
        };
    }
}
