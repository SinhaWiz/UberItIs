import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/format'
import type { Role } from '../types'

interface NavItem {
  to: string
  label: string
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  RIDER: [
    { to: '/ride', label: 'Ride' },
    { to: '/ride/history', label: 'History' },
    { to: '/profile', label: 'Profile' },
  ],
  DRIVER: [
    { to: '/drive', label: 'Drive' },
    { to: '/drive/history', label: 'History' },
    { to: '/profile', label: 'Profile' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/rides', label: 'Rides' },
  ],
}

/** Wide layout for the admin console, narrow phone-style column elsewhere. */
export function AppShell({ wide = false }: { wide?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const items = NAV_BY_ROLE[user.role]

  const onSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-sm">
        <div
          className={cn(
            'mx-auto px-4 h-14 flex items-center justify-between gap-4',
            wide ? 'max-w-6xl' : 'max-w-md',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl font-bold tracking-tight text-ink">Uber</span>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider truncate mt-1">
              {user.role.toLowerCase()}
            </span>
          </div>

          <button
            onClick={onSignOut}
            className="text-sm font-medium text-ink bg-canvas-soft hover:bg-surface px-4 py-2 rounded-full transition-colors duration-150"
          >
            Sign out
          </button>
        </div>

        <nav
          className={cn(
            'mx-auto px-4 flex items-center gap-1 overflow-x-auto',
            wide ? 'max-w-6xl' : 'max-w-md',
          )}
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/ride' || item.to === '/drive' || item.to === '/admin'}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150',
                  'border-b-2 -mb-px',
                  isActive
                    ? 'text-ink border-ink'
                    : 'text-muted border-transparent hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main
        className={cn(
          'flex-1 mx-auto w-full px-4 py-6',
          wide ? 'max-w-6xl' : 'max-w-md',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
