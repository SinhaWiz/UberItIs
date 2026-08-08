import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useNotifications } from '../hooks/queries'
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
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
  ],
  DRIVER: [
    { to: '/drive', label: 'Drive' },
    { to: '/drive/history', label: 'History' },
    { to: '/notifications', label: 'Notifications' },
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
  const { data: notifications } = useNotifications(user?.id)

  if (!user) return null

  const items = NAV_BY_ROLE[user.role]
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0

  const onSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh flex bg-canvas md:flex-row flex-col">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-line bg-canvas flex flex-col md:h-dvh md:sticky md:top-0">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between md:justify-start gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tracking-tight text-ink">Uber</span>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider truncate mt-1">
                {user.role.toLowerCase()}
              </span>
            </div>
            
            {/* Mobile Log Out icon */}
            <button
              onClick={onSignOut}
              aria-label="Log Out"
              className="md:hidden text-muted hover:text-ink transition-colors p-2"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <nav className="px-4 pb-4 md:pb-0 md:px-6 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/ride' || item.to === '/drive' || item.to === '/admin'}
              className={({ isActive }) =>
                cn(
                  'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 rounded-xl',
                  isActive
                    ? 'text-on-primary bg-primary'
                    : 'text-ink hover:bg-canvas-soft',
                )
              }
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-primary text-xs font-semibold">
                    {unreadCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto hidden md:block">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-ink hover:bg-canvas-soft rounded-xl transition-colors duration-150"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      <main
        className={cn(
          'flex-1 mx-auto w-full px-4 py-8 md:py-12 md:px-8',
          wide ? 'max-w-6xl' : 'max-w-xl',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
