import { cn } from '../lib/format'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full',
        'transition-colors duration-200 disabled:opacity-45 disabled:pointer-events-none',
        checked ? 'bg-st-done' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
