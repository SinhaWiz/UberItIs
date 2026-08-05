import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: string
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="bg-elevated border border-line rounded-[var(--radius-card)] p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">
        {value}
      </p>
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  )
}
