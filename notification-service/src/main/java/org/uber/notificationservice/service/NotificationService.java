package org.uber.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.uber.notificationservice.dto.NotificationResponse;
import org.uber.notificationservice.dto.PaymentCompletedEvent;
import org.uber.notificationservice.dto.RideStatusChangedEvent;
import org.uber.notificationservice.exception.ResourceNotFoundException;
import org.uber.notificationservice.model.Notification;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.repository.NotificationRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Creates a notification for the rider, and for the driver too if one was already
     * matched at the time of this status change, per report.md Section 7.3.3.
     */
    public void handleRideStatusChanged(RideStatusChangedEvent event) {
        NotificationType type = mapRideStatus(event.getStatus());
        saveNotification(event.getRiderId(), type, event.getMessage());
        if (event.getDriverId() != null) {
            saveNotification(event.getDriverId(), type, event.getMessage());
        }
    }

    /**
     * Creates a payment-confirmation notification for the rider only.
     */
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        String message = "Payment of " + event.getAmount() + " completed for your ride.";
        saveNotification(event.getRiderId(), NotificationType.PAYMENT_COMPLETED, message);
    }

    /**
     * Returns all notifications for a user, most-recent behavior determined by Mongo insertion order.
     */
    public List<NotificationResponse> getNotificationsByUser(String userId) {
        return notificationRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns only the unread notifications for a user.
     */
    public List<NotificationResponse> getUnreadNotificationsByUser(String userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Marks a notification as read.
     */
    public NotificationResponse markAsRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notification.setIsRead(true);
        Notification updated = notificationRepository.save(notification);
        return toResponse(updated);
    }

    private void saveNotification(String userId, NotificationType type, String message) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .build();
        notificationRepository.save(notification);
    }

    /**
     * Maps ride-service's status string to this service's own NotificationType.
     */
    private NotificationType mapRideStatus(String status) {
        return switch (status) {
            case "REQUESTED" -> NotificationType.RIDE_REQUESTED;
            case "MATCHED" -> NotificationType.RIDE_MATCHED;
            case "IN_PROGRESS" -> NotificationType.RIDE_STARTED;
            case "COMPLETED" -> NotificationType.RIDE_COMPLETED;
            case "CANCELLED" -> NotificationType.RIDE_CANCELLED;
            default -> throw new IllegalArgumentException("Unknown ride status: " + status);
        };
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
