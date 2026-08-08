/**
 * Mirrors the backend DTOs. Single source of truth for API shapes.
 *
 * Timestamps arrive as Java LocalDateTime serialised by Jackson, i.e.
 * "2026-08-05T08:15:32.123" with no timezone suffix.
 */

export type Role = 'RIDER' | 'DRIVER' | 'ADMIN'

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

/** Statuses a ride can still move on from. */
export const ACTIVE_STATUSES: RideStatus[] = [
  'REQUESTED',
  'MATCHED',
  'IN_PROGRESS',
]

export function isTerminal(ride: Pick<Ride, 'status' | 'isPaid' | 'finalFare'>): boolean {
  if (ride.status === 'COMPLETED' && ride.isPaid) return true
  if (ride.status === 'CANCELLED') return true
  return false
}

/* ---------- user-service ---------- */

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  phone: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
}

/** PUT /api/users/{id} reuses RegisterRequest; only name/phone/role are applied. */
export interface UpdateUserRequest {
  name?: string
  phone?: string
  role?: Role
}

/* ---------- driver-service ---------- */

export interface DriverProfile {
  id: string
  userId: string
  vehicleModel: string
  vehiclePlate: string
  vehicleColor: string
  isAvailable: boolean
  currentLatitude: number
  currentLongitude: number
  totalRides: number
  rating: number
  createdAt: string
  updatedAt: string
}

export interface DriverProfileRequest {
  userId?: string
  vehicleModel?: string
  vehiclePlate?: string
  vehicleColor?: string
}

export interface AvailabilityRequest {
  isAvailable: boolean
}

export interface LocationUpdateRequest {
  latitude: number
  longitude: number
}

/* ---------- ride-service ---------- */

export interface Ride {
  id: string
  riderId: string
  driverId: string | null
  pendingDriverId: string | null
  pickupLocation: string
  dropoffLocation: string
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  status: RideStatus
  fareEstimate?: number
  finalFare?: number
  isPaid?: boolean
  requestedAt: string | null
  matchedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export interface CreatePaymentIntentResponse {
  clientSecret: string
  amount: number
}

export interface RideRequestBody {
  riderId: string
  pickupLocation: string
  dropoffLocation: string
  pickupLat?: number
  pickupLng?: number
}

export interface MatchDriverRequest {
  driverId?: string
}

/* ---------- notification-service ---------- */

export interface Notification {
  id: string
  userId: string
  type: string
  message: string
  relatedId: string | null
  isRead: boolean
  createdAt: string
}

/* ---------- errors ---------- */

/** Flat error body produced by every service's GlobalExceptionHandler. */
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
}
