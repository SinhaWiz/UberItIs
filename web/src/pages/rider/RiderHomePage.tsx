import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../../auth/AuthContext'
import { SkeletonCard } from '../../components/Skeleton'
import { queryKeys, useRidesByRider } from '../../hooks/queries'
import { ACTIVE_STATUSES, type Ride } from '../../types'
import { ActiveRide } from './ActiveRide'
import { RequestRideForm } from './RequestRideForm'

function findActiveRide(rides: Ride[] | undefined): Ride | undefined {
  return rides?.find((ride) => ACTIVE_STATUSES.includes(ride.status))
}

export function RiderHomePage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const { data: rides, isLoading } = useRidesByRider(user.id)

  /*
   * A finished ride drops out of the active list, but the rider should still
   * see the summary until they dismiss it, so keep showing that ride id.
   */
  const [dismissedRideId, setDismissedRideId] = useState<string | null>(null)
  const [stickyRideId, setStickyRideId] = useState<string | null>(null)

  const activeRide = findActiveRide(rides)
  const currentRideId = activeRide?.id ?? stickyRideId

  if (activeRide && stickyRideId !== activeRide.id) {
    setStickyRideId(activeRide.id)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (currentRideId && currentRideId !== dismissedRideId) {
    return (
      <ActiveRide
        rideId={currentRideId}
        riderId={user.id}
        onDismiss={() => {
          setDismissedRideId(currentRideId)
          setStickyRideId(null)
          queryClient.invalidateQueries({
            queryKey: queryKeys.ridesByRider(user.id),
          })
        }}
      />
    )
  }

  return <RequestRideForm riderId={user.id} />
}
