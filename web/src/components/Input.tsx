import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../lib/format'

const FIELD_CLASSES =
  'w-full h-11 px-3 rounded-[var(--radius-control)] bg-elevated text-ink ' +
  'border border-line placeholder:text-muted transition-colors duration-150 ' +
  'hover:border-muted/50 disabled:opacity-50 disabled:pointer-events-none'

interface FieldShellProps {
  id: string
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className, ...props }: InputProps) {
  const generatedId = useId()
  const id = props.id ?? generatedId

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_CLASSES, error && 'border-danger', className)}
      />
    </FieldShell>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const id = props.id ?? generatedId

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_CLASSES, 'cursor-pointer', error && 'border-danger', className)}
      >
        {children}
      </select>
    </FieldShell>
  )
}
