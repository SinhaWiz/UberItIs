import { cn, NOTIFICATION_LABEL, timeAgo } from '../lib/format'
import type { AppNotification } from '../types'

interface NotificationItemProps {
  notification: AppNotification
  onMarkAsRead: (id: string) => void
  marking: boolean
}

/** One row in the notification list. Unread ones carry a small accent dot. */
export function NotificationItem({
  notification,
  onMarkAsRead,
  marking,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        'bg-elevated border border-line rounded-[var(--radius-card)] p-4',
        'flex items-start gap-3',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-1.5 rounded-full shrink-0',
          notification.isRead ? 'bg-transparent' : 'bg-accent',
        )}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            {NOTIFICATION_LABEL[notification.type]}
          </span>
          <span className="text-xs text-muted shrink-0">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-ink break-words">{notification.message}</p>
      </div>

      {!notification.isRead && (
        <button
          onClick={() => onMarkAsRead(notification.id)}
          disabled={marking}
          className="text-xs font-medium text-accent hover:underline shrink-0 disabled:opacity-45"
        >
          Mark read
        </button>
      )}
    </div>
  )
}
