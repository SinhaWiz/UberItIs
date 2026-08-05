import type { Ride, RideStatus } from '../types'
import { parseDate } from './format'

export type RideFilter = 'ALL' | RideStatus

export const RIDE_FILTERS: Array<{ value: RideFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'IN_PROGRESS', label: 'On trip' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function matchesFilter(ride: Ride, filter: RideFilter): boolean {
  return filter === 'ALL' || ride.status === filter
}

/** Newest first; rides without a timestamp sink to the bottom. */
export function sortByNewest(rides: Ride[]): Ride[] {
  return [...rides].sort((a, b) => {
    const left = parseDate(a.requestedAt)?.getTime() ?? 0
    const right = parseDate(b.requestedAt)?.getTime() ?? 0
    return right - left
  })
}

/**
 * Trip totals for a driver. This sums completed fares only; it is not settled
 * earnings, since payment-service isn't live yet.
 */
export function sumCompletedFares(rides: Ride[]): number {
  return rides
    .filter((ride) => ride.status === 'COMPLETED')
    .reduce((total, ride) => total + (ride.finalFare ?? ride.fareEstimate ?? 0), 0)
}

export function countByStatus(rides: Ride[], status: RideStatus): number {
  return rides.filter((ride) => ride.status === status).length
}
