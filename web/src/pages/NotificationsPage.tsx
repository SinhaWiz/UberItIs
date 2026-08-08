import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../auth/AuthContext'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { NotificationItem } from '../components/NotificationItem'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { usePageTitle } from '../hooks/usePageTitle'
import { queryKeys, useNotifications } from '../hooks/queries'
import { ApiError, api } from '../lib/api'
import type { AppNotification } from '../types'

export function NotificationsPage() {
  usePageTitle('Notifications')
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications(user.id)

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.put<AppNotification>(`/api/notifications/${id}/read`),
    onSuccess: (updated) => {
      queryClient.setQueryData<AppNotification[]>(
        queryKeys.notifications(user.id),
        (current) => current?.map((n) => (n.id === updated.id ? updated : n)),
      )
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not mark as read',
        'error',
      )
    },
  })

  const sorted = [...(notifications ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const unreadCount = sorted.filter((n) => !n.isRead).length

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted">
          {unreadCount > 0
            ? `${unreadCount} unread`
            : 'Ride and payment updates land here.'}
        </p>
      </header>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : sorted.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="Nothing here yet"
            description="You'll see updates here as your rides and payments progress."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={(id) => markAsRead.mutate(id)}
              marking={markAsRead.isPending && markAsRead.variables === notification.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
