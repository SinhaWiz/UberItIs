import { useMemo, useState } from 'react'
import { useCurrentUser } from '../../auth/AuthContext'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { FilterChips } from '../../components/FilterChips'
import { RideListItem } from '../../components/RideListItem'
import { SkeletonCard } from '../../components/Skeleton'
import { useRidesByRider } from '../../hooks/queries'
import { sortByNewest, type RideFilter, RIDE_FILTERS, matchesFilter } from '../../lib/rides'

export function RiderHistoryPage() {
  const user = useCurrentUser()
  const { data: rides, isLoading } = useRidesByRider(user.id)
  const [filter, setFilter] = useState<RideFilter>('ALL')

  const visible = useMemo(
    () => sortByNewest(rides ?? []).filter((ride) => matchesFilter(ride, filter)),
    [rides, filter],
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your rides</h1>
        <p className="text-sm text-muted">Every trip you've requested.</p>
      </header>

      <FilterChips options={RIDE_FILTERS} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visible.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="Nothing here yet"
            description={
              filter === 'ALL'
                ? 'Your trips will appear here once you take one.'
                : 'No rides match this filter.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((ride) => (
            <RideListItem key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </div>
  )
}
