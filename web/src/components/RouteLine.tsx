interface RouteLineProps {
  pickup: string
  dropoff: string
}

/** Compact pickup → dropoff pair with a connecting rail. */
export function RouteLine({ pickup, dropoff }: RouteLineProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span className="size-2 rounded-full bg-ink" aria-hidden />
        <span className="w-px flex-1 min-h-6 bg-line my-1" aria-hidden />
        <span className="size-2 rounded-sm bg-ink" aria-hidden />
      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Pickup</span>
          <span className="text-sm font-medium text-ink break-words">{pickup}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted">Dropoff</span>
          <span className="text-sm font-medium text-ink break-words">{dropoff}</span>
        </div>
      </div>
    </div>
  )
}
