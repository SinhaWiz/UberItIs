import { Link } from 'react-router-dom'
import { StatusPill } from './StatusPill'
import { formatDateTime, formatFare } from '../lib/format'
import type { Ride } from '../types'

/** One row in a ride history list, linking through to the full detail. */
export function RideListItem({ ride }: { ride: Ride }) {
  const fare = ride.finalFare ?? ride.fareEstimate

  return (
    <Link
      to={`/rides/${ride.id}`}
      className="block bg-elevated border border-line rounded-[var(--radius-card)] p-4 transition-colors duration-150 hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink min-w-0">
          <span className="break-words">{ride.pickupLocation}</span>
          <span className="text-muted mx-1.5">→</span>
          <span className="break-words">{ride.dropoffLocation}</span>
        </p>
        <StatusPill status={ride.status} />
      </div>

      <div className="flex items-center justify-between gap-3 mt-2">
        <span className="text-xs text-muted">
          {formatDateTime(ride.requestedAt)}
        </span>
        <span className="text-sm font-medium text-ink">{formatFare(fare)}</span>
      </div>
    </Link>
  )
}
