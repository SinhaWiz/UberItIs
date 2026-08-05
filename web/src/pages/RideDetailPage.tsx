import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardRow } from '../components/Card'
import { DriverCard } from '../components/DriverCard'
import { EmptyState } from '../components/EmptyState'
import { RideTimeline } from '../components/RideTimeline'
import { RouteLine } from '../components/RouteLine'
import { SkeletonCard } from '../components/Skeleton'
import { StatusPill } from '../components/StatusPill'
import { Button } from '../components/Button'
import { useRide } from '../hooks/queries'
import { formatDateTime, formatFare } from '../lib/format'

/** Read-only view of a past ride, shared by the rider and driver histories. */
export function RideDetailPage() {
  const { rideId } = useParams<{ rideId: string }>()
  const navigate = useNavigate()
  const { data: ride, isLoading, isError } = useRide(rideId ?? null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError || !ride) {
    return (
      <Card padded={false}>
        <EmptyState
          title="Ride not found"
          description="This trip may have been removed."
          action={<Button onClick={() => navigate(-1)}>Go back</Button>}
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => navigate(-1)}
        className="self-start text-sm text-muted hover:text-ink transition-colors duration-150"
      >
        ← Back
      </button>

      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Trip details</h1>
          <p className="text-sm text-muted">
            {formatDateTime(ride.requestedAt)}
          </p>
        </div>
        <StatusPill status={ride.status} />
      </header>

      <Card>
        <RideTimeline ride={ride} />
      </Card>

      {ride.driverId && (
        <Card>
          <DriverCard driverId={ride.driverId} />
        </Card>
      )}

      <Card>
        <RouteLine pickup={ride.pickupLocation} dropoff={ride.dropoffLocation} />
      </Card>

      <Card>
        <CardRow label="Fare estimate" value={formatFare(ride.fareEstimate)} />
        <CardRow label="Final fare" value={formatFare(ride.finalFare)} />
      </Card>
    </div>
  )
}
