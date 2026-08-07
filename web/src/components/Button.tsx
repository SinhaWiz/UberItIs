import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/format'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:opacity-90 active:opacity-80 border border-transparent',
  secondary:
    'bg-canvas text-ink hover:bg-surface active:bg-surface',
  subtle:
    'bg-canvas-soft text-ink hover:bg-surface active:bg-surface',
  ghost:
    'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-surface',
  danger:
    'bg-danger-soft text-danger border border-transparent hover:opacity-85 active:opacity-75',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'font-medium transition-[opacity,background-color] duration-150',
        'disabled:opacity-45 disabled:pointer-events-none select-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}
