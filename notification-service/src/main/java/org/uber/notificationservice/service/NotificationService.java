package org.uber.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.uber.notificationservice.dto.NotificationResponse;
import org.uber.notificationservice.model.Notification;
import org.uber.notificationservice.model.NotificationType;
import org.uber.notificationservice.repository.NotificationRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Persists a notification for a user. Called by the RabbitMQ event listeners
     * as a fire-and-forget operation — failures here should not propagate back
     * to the publishing service.
     */
    public void createNotification(String userId, NotificationType type, String message) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .build();

        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getUserNotifications(String userId) {
        return notificationRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
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
