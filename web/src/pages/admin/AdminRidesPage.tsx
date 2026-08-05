import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { StatusPill } from '../../components/StatusPill'
import { Table, Td, Th, Tr } from '../../components/Table'
import { useActiveRides, useAllUsers } from '../../hooks/queries'
import { formatFare, timeAgo } from '../../lib/format'
import { sortByNewest } from '../../lib/rides'

export function AdminRidesPage() {
  const { data: rides, isLoading } = useActiveRides()
  const { data: users } = useAllUsers()

  /*
   * Rides only carry user ids. Rather than a lookup per row, fetch the user
   * list once and resolve names from it.
   */
  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users ?? []) map.set(user.id, user.name)
    return map
  }, [users])

  const visible = useMemo(() => sortByNewest(rides ?? []), [rides])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Active rides</h1>
        <p className="text-sm text-muted">
          Every ride currently in flight. Refreshes automatically.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : visible.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="Nothing in flight"
            description="No rides are active right now."
          />
        </Card>
      ) : (
        <Table
          head={
            <>
              <Th>Status</Th>
              <Th>Rider</Th>
              <Th>Driver</Th>
              <Th>Route</Th>
              <Th>Requested</Th>
              <Th>Fare</Th>
              <Th />
            </>
          }
        >
          {visible.map((ride) => (
            <Tr key={ride.id}>
              <Td>
                <StatusPill status={ride.status} />
              </Td>
              <Td>
                <span className="text-ink">
                  {nameById.get(ride.riderId) ?? '—'}
                </span>
              </Td>
              <Td>
                <span className={ride.driverId ? 'text-ink' : 'text-muted'}>
                  {ride.driverId
                    ? (nameById.get(ride.driverId) ?? 'Assigned')
                    : 'Unassigned'}
                </span>
              </Td>
              <Td>
                <span className="text-muted">
                  {ride.pickupLocation} → {ride.dropoffLocation}
                </span>
              </Td>
              <Td>
                <span className="text-muted">{timeAgo(ride.requestedAt)}</span>
              </Td>
              <Td>
                <span className="tabular-nums">
                  {formatFare(ride.finalFare ?? ride.fareEstimate)}
                </span>
              </Td>
              <Td>
                <Link
                  to={`/rides/${ride.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View
                </Link>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  )
}
