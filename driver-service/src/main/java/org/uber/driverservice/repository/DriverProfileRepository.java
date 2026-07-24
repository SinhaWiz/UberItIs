package org.uber.driverservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import org.uber.driverservice.model.DriverProfile;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends MongoRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    boolean existsByUserId(String userId);

    List<DriverProfile> findByIsAvailableTrue();

    List<DriverProfile> findByIsAvailableTrueAndCurrentLatitudeBetweenAndCurrentLongitudeBetween(
            double minLat, double maxLat, double minLng, double maxLng);
}