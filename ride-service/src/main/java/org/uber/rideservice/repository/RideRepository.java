package org.uber.rideservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import org.uber.rideservice.model.Ride;
import org.uber.rideservice.model.RideStatus;

import java.util.List;

@Repository
public interface RideRepository extends MongoRepository<Ride, String> {

    List<Ride> findByRiderId(String riderId);

    List<Ride> findByDriverId(String driverId);

    List<Ride> findByStatusIn(List<RideStatus> statuses);
}
