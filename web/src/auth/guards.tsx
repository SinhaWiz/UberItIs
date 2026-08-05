import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { HOME_BY_ROLE, useAuth } from './AuthContext'
import type { Role } from '../types'

/** Blocks unauthenticated access, remembering where the user was headed. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

/** Keeps each role inside its own area, redirecting to that role's home. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== role) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  }

  return <Outlet />
}

/** Sends an already-signed-in user away from the login/register screens. */
export function RedirectIfAuthenticated() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  }

  return <Outlet />
}
