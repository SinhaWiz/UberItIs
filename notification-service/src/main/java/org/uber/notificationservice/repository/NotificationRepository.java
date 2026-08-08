package org.uber.notificationservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.uber.notificationservice.model.Notification;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(String userId);
}
