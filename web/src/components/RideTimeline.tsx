import type { Ride, RideStatus } from '../types'
import { cn, formatTime } from '../lib/format'

interface Step {
  status: Exclude<RideStatus, 'CANCELLED'>
  label: string
  at: (ride: Ride) => string | null
}

const STEPS: Step[] = [
  { status: 'REQUESTED', label: 'Ride requested', at: (r) => r.requestedAt },
  { status: 'MATCHED', label: 'Driver matched', at: (r) => r.matchedAt },
  { status: 'IN_PROGRESS', label: 'Trip started', at: (r) => r.startedAt },
  { status: 'COMPLETED', label: 'Trip completed', at: (r) => r.completedAt },
]

const ACCENT: Record<Step['status'], string> = {
  REQUESTED: 'text-st-requested',
  MATCHED: 'text-st-matched',
  IN_PROGRESS: 'text-st-progress',
  COMPLETED: 'text-st-done',
}

/**
 * Vertical progress of a ride. Past steps are settled and quiet, the current
 * step is the one point of emphasis, and future steps stay hollow.
 */
export function RideTimeline({ ride }: { ride: Ride }) {
  const cancelled = ride.status === 'CANCELLED'
  const currentIndex = cancelled
    ? -1
    : STEPS.findIndex((step) => step.status === ride.status)

  return (
    <ol className="flex flex-col" aria-live="polite">
      {STEPS.map((step, index) => {
        const time = step.at(ride)
        const isDone = !cancelled && index < currentIndex
        const isCurrent = !cancelled && index === currentIndex
        const isFuture = cancelled || index > currentIndex
        const isLast = index === STEPS.length - 1

        return (
          <li key={step.status} className="flex gap-3">
            {/* Marker rail */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid place-items-center size-5 rounded-full border-2 transition-colors duration-200 shrink-0',
                  isCurrent && cn('border-current', ACCENT[step.status]),
                  isDone && 'border-ink bg-ink',
                  isFuture && 'border-line',
                )}
              >
                {isCurrent && (
                  <span
                    className="size-2 rounded-full bg-current"
                    style={{ animation: 'ridepulse 1.8s ease-in-out infinite' }}
                  />
                )}
                {isDone && (
                  <svg viewBox="0 0 12 12" className="size-3 text-canvas" aria-hidden>
                    <path
                      d="M2.5 6.5l2.2 2.2 4.8-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              {!isLast && (
                <span
                  className={cn(
                    'w-0.5 flex-1 min-h-8 transition-colors duration-200',
                    isDone ? 'bg-ink' : 'bg-line',
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm leading-5',
                  isCurrent && 'font-semibold text-ink',
                  isDone && 'font-medium text-ink',
                  isFuture && 'text-muted',
                )}
              >
                {step.label}
              </p>
              {time && (
                <p className="text-xs text-muted mt-0.5">{formatTime(time)}</p>
              )}
            </div>
          </li>
        )
      })}

      <style>{`@keyframes ridepulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </ol>
  )
}
