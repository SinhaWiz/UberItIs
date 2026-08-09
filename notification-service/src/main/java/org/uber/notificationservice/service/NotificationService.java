package org.uber.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.uber.notificationservice.dto.NotificationResponse;
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
     * Creates and persists a new notification for the given user.
     */
    public NotificationResponse createNotification(String userId, NotificationType type, String message, String relatedId) {
        if (type == NotificationType.RIDE_CANCELLED && relatedId != null) {
            List<Notification> requests = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId).stream()
                .filter(n -> n.getType() == NotificationType.RIDE_REQUESTED && relatedId.equals(n.getRelatedId()))
                .toList();
            for (Notification n : requests) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .relatedId(relatedId)
                .build();

        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    /**
     * Returns all notifications for a user, newest first.
     */
    public List<NotificationResponse> getNotificationsByUserId(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns only unread notifications for a user, newest first.
     */
    public List<NotificationResponse> getUnreadNotificationsByUserId(String userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Marks a single notification as read.
     */
    public NotificationResponse markAsRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notification.setIsRead(true);
        Notification updated = notificationRepository.save(notification);
        return toResponse(updated);
    }

    /**
     * Maps a Notification entity to a NotificationResponse DTO.
     */
    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType())
                .message(notification.getMessage())
                .relatedId(notification.getRelatedId())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
