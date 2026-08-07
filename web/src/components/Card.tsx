import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/format'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'bg-canvas rounded-2xl',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardRowProps {
  label: string
  value: ReactNode
}

/** Label/value pair used throughout detail cards. */
export function CardRow({ label, value }: CardRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-ink text-right">{value}</span>
    </div>
  )
}
