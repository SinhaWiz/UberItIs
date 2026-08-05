import { useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { FilterChips } from '../../components/FilterChips'
import { Skeleton } from '../../components/Skeleton'
import { Table, Td, Th, Tr } from '../../components/Table'
import { useAllUsers } from '../../hooks/queries'
import { formatDateTime } from '../../lib/format'
import type { Role } from '../../types'

type RoleFilter = 'ALL' | Role

const FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'RIDER', label: 'Riders' },
  { value: 'DRIVER', label: 'Drivers' },
  { value: 'ADMIN', label: 'Admins' },
]

const ROLE_STYLES: Record<Role, string> = {
  RIDER: 'text-st-matched bg-st-matched/10',
  DRIVER: 'text-st-progress bg-st-progress/10',
  ADMIN: 'text-st-requested bg-st-requested/10',
}

export function AdminUsersPage() {
  const { data: users, isLoading } = useAllUsers()
  const [filter, setFilter] = useState<RoleFilter>('ALL')

  // Filtering client-side keeps it instant; the list is already loaded.
  const visible = useMemo(() => {
    const all = users ?? []
    return filter === 'ALL' ? all : all.filter((user) => user.role === filter)
  }, [users, filter])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted">Everyone registered on the platform.</p>
      </header>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : visible.length === 0 ? (
        <Card padded={false}>
          <EmptyState title="No users" description="Nobody matches this filter." />
        </Card>
      ) : (
        <Table
          head={
            <>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
            </>
          }
        >
          {visible.map((user) => (
            <Tr key={user.id}>
              <Td>
                <span className="font-medium text-ink">{user.name}</span>
              </Td>
              <Td>
                <span className="text-muted">{user.email}</span>
              </Td>
              <Td>
                <span className="text-muted">{user.phone}</span>
              </Td>
              <Td>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[user.role]}`}
                >
                  {user.role.toLowerCase()}
                </span>
              </Td>
              <Td>
                <span className="text-muted">{formatDateTime(user.createdAt)}</span>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  )
}
