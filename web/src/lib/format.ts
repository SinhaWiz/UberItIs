import type { NotificationType, RideStatus } from '../types'

/**
 * Jackson serialises LocalDateTime without a timezone ("2026-08-05T08:15:32").
 * Safari treats such strings as invalid unless normalised, so parse defensively.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFare(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `৳${value.toFixed(2)}`
}

/** Elapsed time since a timestamp, e.g. "4m ago". */
export function timeAgo(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return '—'

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}

export const STATUS_LABEL: Record<RideStatus, string> = {
  REQUESTED: 'Finding a driver',
  MATCHED: 'Driver on the way',
  IN_PROGRESS: 'On trip',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  RIDE_REQUESTED: 'Ride requested',
  RIDE_MATCHED: 'Driver matched',
  RIDE_STARTED: 'Trip started',
  RIDE_COMPLETED: 'Trip completed',
  RIDE_CANCELLED: 'Trip cancelled',
  PAYMENT_COMPLETED: 'Payment',
}

/** Joins truthy class names. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
