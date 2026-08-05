import type { RideStatus } from '../types'
import { STATUS_LABEL, cn } from '../lib/format'

/**
 * Colour is reserved almost entirely for ride state, so this pill is the main
 * carrier of meaning in lists and headers.
 */
const STATUS_STYLES: Record<RideStatus, string> = {
  REQUESTED: 'text-st-requested bg-st-requested/10',
  MATCHED: 'text-st-matched bg-st-matched/10',
  IN_PROGRESS: 'text-st-progress bg-st-progress/10',
  COMPLETED: 'text-st-done bg-st-done/10',
  CANCELLED: 'text-st-cancelled bg-st-cancelled/10',
}

interface StatusPillProps {
  status: RideStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-xs font-medium whitespace-nowrap',
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}
