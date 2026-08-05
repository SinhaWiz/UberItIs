import { Card } from '../../components/Card'
import { Skeleton } from '../../components/Skeleton'
import { StatTile } from '../../components/StatTile'
import { StatusPill } from '../../components/StatusPill'
import { useActiveRides, useAllUsers } from '../../hooks/queries'
import { countByStatus } from '../../lib/rides'
import type { Role } from '../../types'

const ROLES: Role[] = ['RIDER', 'DRIVER', 'ADMIN']

/**
 * There is no statistics endpoint, so everything here is derived client-side
 * from the users list and the active-rides list.
 */
export function AdminOverviewPage() {
  const { data: users, isLoading: loadingUsers } = useAllUsers()
  const { data: activeRides, isLoading: loadingRides } = useActiveRides()

  const loading = loadingUsers || loadingRides

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    )
  }

  const allUsers = users ?? []
  const rides = activeRides ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted">
          Live snapshot of the platform. Refreshes automatically.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          People
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Total users" value={allUsers.length} />
          {ROLES.map((role) => (
            <StatTile
              key={role}
              label={`${role.charAt(0)}${role.slice(1).toLowerCase()}s`}
              value={allUsers.filter((user) => user.role === role).length}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Active rides
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="In flight" value={rides.length} />
          <StatTile
            label="Awaiting a driver"
            value={countByStatus(rides, 'REQUESTED')}
          />
          <StatTile label="Matched" value={countByStatus(rides, 'MATCHED')} />
          <StatTile
            label="On trip"
            value={countByStatus(rides, 'IN_PROGRESS')}
          />
        </div>
      </section>

      {rides.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Right now
          </h2>
          <Card>
            <div className="flex flex-wrap gap-2">
              {rides.map((ride) => (
                <StatusPill key={ride.id} status={ride.status} />
              ))}
            </div>
          </Card>
        </section>
      )}

      <p className="text-xs text-muted">
        Completed-ride totals aren't shown here: the backend exposes rides only
        per rider, per driver, or when active.
      </p>
    </div>
  )
}
