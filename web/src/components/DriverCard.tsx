import { useDriverProfile, useUser } from '../hooks/queries'
import { Skeleton } from './Skeleton'

/**
 * Driver identity lives in user-service while the vehicle lives in
 * driver-service, so this pulls from both and shows them as one unit.
 */
export function DriverCard({ driverId }: { driverId: string }) {
  const { data: driver, isLoading: loadingUser } = useUser(driverId)
  const { data: profile, isLoading: loadingProfile } = useDriverProfile(driverId)

  if (loadingUser || loadingProfile) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    )
  }

  const initials = (driver?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const vehicle = profile
    ? [profile.vehicleColor, profile.vehicleModel].filter(Boolean).join(' ')
    : null

  return (
    <div className="flex items-center gap-3">
      <div className="grid place-items-center size-11 rounded-full bg-surface border border-line text-sm font-semibold text-ink shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">
          {driver?.name ?? 'Your driver'}
        </p>
        <p className="text-xs text-muted truncate">
          {vehicle ? `${vehicle} · ${profile?.vehiclePlate}` : 'Vehicle details unavailable'}
        </p>
      </div>

      {driver?.phone && (
        <a
          href={`tel:${driver.phone}`}
          className="text-sm font-medium text-accent hover:underline shrink-0"
        >
          Call
        </a>
      )}
    </div>
  )
}
