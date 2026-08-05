import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Card, CardRow } from '../../components/Card'
import { RouteLine } from '../../components/RouteLine'
import { Skeleton } from '../../components/Skeleton'
import { StatusPill } from '../../components/StatusPill'
import { useToast } from '../../components/Toast'
import { queryKeys, useUser } from '../../hooks/queries'
import { ApiError, api } from '../../lib/api'
import { formatFare } from '../../lib/format'
import type { Ride } from '../../types'

interface AssignedRideProps {
  ride: Ride
  driverId: string
}

/**
 * The one trip a driver is currently on. Exactly one primary action is offered
 * at a time so there's never a question about what to do next.
 */
export function AssignedRide({ ride, driverId }: AssignedRideProps) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const { data: rider, isLoading: loadingRider } = useUser(ride.riderId)

  const advance = useMutation({
    mutationFn: (action: 'start' | 'complete') =>
      api.put<Ride>(`/api/rides/${ride.id}/${action}`),
    onSuccess: (updated, action) => {
      queryClient.setQueryData(queryKeys.ride(ride.id), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.ridesByDriver(driverId) })
      // Completing frees the driver again, so the profile is stale too.
      queryClient.invalidateQueries({ queryKey: queryKeys.driverProfile(driverId) })
      notify(action === 'start' ? 'Trip started' : 'Trip completed')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not update the trip',
        'error',
      )
    },
  })

  const isMatched = ride.status === 'MATCHED'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isMatched ? 'Pick up your rider' : 'Trip in progress'}
          </h1>
          <p className="text-sm text-muted">
            {isMatched
              ? 'Head to the pickup point, then start the trip.'
              : 'Complete the trip when you arrive.'}
          </p>
        </div>
        <StatusPill status={ride.status} />
      </header>

      <Card>
        {loadingRider ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-11 rounded-full bg-surface border border-line text-sm font-semibold shrink-0">
              {(rider?.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {rider?.name ?? 'Rider'}
              </p>
              <p className="text-xs text-muted truncate">Rider</p>
            </div>
            {rider?.phone && (
              <a
                href={`tel:${rider.phone}`}
                className="text-sm font-medium text-accent hover:underline shrink-0"
              >
                Call
              </a>
            )}
          </div>
        )}
      </Card>

      <Card>
        <RouteLine pickup={ride.pickupLocation} dropoff={ride.dropoffLocation} />
      </Card>

      <Card>
        <CardRow label="Fare estimate" value={formatFare(ride.fareEstimate)} />
      </Card>

      <Button
        size="lg"
        fullWidth
        loading={advance.isPending}
        onClick={() => advance.mutate(isMatched ? 'start' : 'complete')}
      >
        {isMatched ? 'Start trip' : 'Complete trip'}
      </Button>
    </div>
  )
}
