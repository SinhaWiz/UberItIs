import { useMemo, useState } from 'react'
import { useCurrentUser } from '../../auth/AuthContext'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { FilterChips } from '../../components/FilterChips'
import { RideListItem } from '../../components/RideListItem'
import { SkeletonCard } from '../../components/Skeleton'
import { useRidesByDriver } from '../../hooks/queries'
import { formatFare } from '../../lib/format'
import {
  RIDE_FILTERS,
  countByStatus,
  matchesFilter,
  sortByNewest,
  sumCompletedFares,
  type RideFilter,
} from '../../lib/rides'

export function DriverHistoryPage() {
  const user = useCurrentUser()
  const { data: rides, isLoading } = useRidesByDriver(user.id)
  const [filter, setFilter] = useState<RideFilter>('ALL')

  const all = useMemo(() => rides ?? [], [rides])
  const visible = useMemo(
    () => sortByNewest(all).filter((ride) => matchesFilter(ride, filter)),
    [all, filter],
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your trips</h1>
        <p className="text-sm text-muted">Trips you've driven.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-muted">Completed</p>
          <p className="text-2xl font-semibold tracking-tight mt-0.5">
            {countByStatus(all, 'COMPLETED')}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Trip total</p>
          <p className="text-2xl font-semibold tracking-tight mt-0.5">
            {formatFare(sumCompletedFares(all))}
          </p>
        </Card>
      </div>

      <FilterChips options={RIDE_FILTERS} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visible.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No trips yet"
            description={
              filter === 'ALL'
                ? 'Go online to start receiving trips.'
                : 'No trips match this filter.'
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
