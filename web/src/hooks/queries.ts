import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { isTerminal, type DriverProfile, type Ride, type User } from '../types'

/**
 * There is no push channel in the backend, so anything live is polled.
 * Intervals are deliberately modest — this is a demo system, not production.
 */
export const RIDE_POLL_MS = 4_000
export const DRIVER_POLL_MS = 5_000
export const ADMIN_POLL_MS = 10_000

export const queryKeys = {
  ride: (id: string) => ['rides', 'detail', id] as const,
  ridesByRider: (riderId: string) => ['rides', 'rider', riderId] as const,
  ridesByDriver: (driverId: string) => ['rides', 'driver', driverId] as const,
  activeRides: ['rides', 'active'] as const,
  user: (id: string) => ['users', id] as const,
  users: ['users', 'all'] as const,
  driverProfile: (userId: string) => ['drivers', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  paymentByRide: (rideId: string) => ['payments', 'ride', rideId] as const,
}

/** Polls a single ride until it reaches a terminal status. */
export function useRide(rideId: string | null) {
  return useQuery({
    queryKey: queryKeys.ride(rideId ?? ''),
    queryFn: () => api.get<Ride>(`/api/rides/${rideId}`),
    enabled: rideId !== null,
    refetchInterval: (query) => {
      const ride = query.state.data as Ride | undefined
      return ride && isTerminal(ride.status, ride.isPaid) ? false : RIDE_POLL_MS
    },
  })
}

export function useRidesByRider(riderId: string) {
  return useQuery({
    queryKey: queryKeys.ridesByRider(riderId),
    queryFn: () => api.get<Ride[]>(`/api/rides/rider/${riderId}`),
  })
}

/**
 * A driver has no inbox of incoming requests, so the dashboard discovers work
 * by polling its own ride list and looking for a non-terminal ride.
 */
export function useRidesByDriver(driverId: string, poll = false) {
  return useQuery({
    queryKey: queryKeys.ridesByDriver(driverId),
    queryFn: () => api.get<Ride[]>(`/api/rides/driver/${driverId}`),
    refetchInterval: poll ? DRIVER_POLL_MS : false,
  })
}

export function useActiveRides(poll = true) {
  return useQuery({
    queryKey: queryKeys.activeRides,
    queryFn: () => api.get<Ride[]>('/api/rides/active'),
    refetchInterval: poll ? ADMIN_POLL_MS : false,
  })
}

export function useUser(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user(userId ?? ''),
    queryFn: () => api.get<User>(`/api/users/${userId}`),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

export function useAllUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<User[]>('/api/users'),
  })
}

export function useDriverProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.driverProfile(userId ?? ''),
    queryFn: () => api.get<DriverProfile>(`/api/drivers/${userId}`),
    enabled: Boolean(userId),
    // A missing profile is a real state (driver hasn't onboarded), not a bug.
    retry: false,
  })
}

export function useNotifications(userId: string | null | undefined, poll = true) {
  return useQuery({
    queryKey: queryKeys.notifications(userId ?? ''),
    queryFn: () => api.get<import('../types').Notification[]>(`/api/notifications/user/${userId}/unread`),
    enabled: Boolean(userId),
    refetchInterval: poll ? 3_000 : false,
  })
}

export function usePaymentByRide(rideId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.paymentByRide(rideId ?? ''),
    queryFn: () => api.get<any>(`/api/payments/ride/${rideId}`),
    enabled: Boolean(rideId),
    retry: false, // 404 is a valid state if payment doesn't exist yet
  })
}
