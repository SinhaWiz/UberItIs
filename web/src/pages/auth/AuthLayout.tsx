import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-4 py-12 md:py-20">
      <div className="w-full max-w-[480px] bg-canvas md:rounded-2xl md:p-10 p-6 shadow-sm">
        <header className="flex flex-col gap-6 mb-8">
          <span className="text-3xl font-bold tracking-tight text-ink">Uber</span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px] leading-[1.15] font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="text-base text-ink/80 font-medium">{subtitle}</p>}
          </div>
        </header>

        {children}

        {footer && (
          <div className="mt-8 pt-6 border-t border-line text-sm text-ink/70 text-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
