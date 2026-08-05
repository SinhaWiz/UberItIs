import { cn } from '../lib/format'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('rounded-md bg-line', className)}
      style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
    >
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>
    </div>
  )
}

/** Placeholder matching the shape of a ride list item. */
export function SkeletonCard() {
  return (
    <div className="bg-elevated border border-line rounded-[var(--radius-card)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
