import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, setUnauthorizedHandler, tokenStore, userStore } from '../lib/api'
import type {
  LoginResponse,
  RegisterRequest,
  Role,
  User,
} from '../types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: RegisterRequest) => Promise<User>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Landing route for each role after signing in. */
export const HOME_BY_ROLE: Record<Role, string> = {
  RIDER: '/ride',
  DRIVER: '/drive',
  ADMIN: '/admin',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => userStore.get<User>())

  const logout = useCallback(() => {
    tokenStore.clear()
    userStore.clear()
    setUser(null)
  }, [])

  /*
   * The gateway returns 401 once the 24h token expires. Dropping the session
   * here is enough — RequireAuth sees a null user and redirects to sign-in.
   */
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/api/users/login', {
      email,
      password,
    })

    tokenStore.set(response.token)
    userStore.set(response.user)
    setUser(response.user)

    return response.user
  }, [])

  const register = useCallback(
    async (payload: RegisterRequest) => {
      // Registration only creates the account; the token comes from login.
      await api.post<User>('/api/users/register', payload)
      return login(payload.email, payload.password)
    },
    [login],
  )

  const updateUser = useCallback((next: User) => {
    userStore.set(next)
    setUser(next)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/** Convenience for pages that are only reachable when signed in. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) {
    throw new Error('useCurrentUser requires an authenticated user')
  }
  return user
}
