import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="text-xl font-semibold tracking-tight">Uber</span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </header>

        {children}

        {footer && <p className="text-sm text-muted text-center">{footer}</p>}
      </div>
    </div>
  )
}
