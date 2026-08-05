import { Navigate, Route, Routes } from 'react-router-dom'
import { HOME_BY_ROLE, useAuth } from './auth/AuthContext'
import {
  RedirectIfAuthenticated,
  RequireAuth,
  RequireRole,
} from './auth/guards'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DriverOnboardingPage } from './pages/driver/DriverOnboardingPage'
import { DriverHistoryPage } from './pages/driver/DriverHistoryPage'
import { DriverHomePage } from './pages/driver/DriverHomePage'
import { RiderHistoryPage } from './pages/rider/RiderHistoryPage'
import { RiderHomePage } from './pages/rider/RiderHomePage'
import { ProfilePage } from './pages/ProfilePage'
import { RideDetailPage } from './pages/RideDetailPage'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { AdminRidesPage } from './pages/admin/AdminRidesPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'

/** Sends people to their role's home, or to sign-in when signed out. */
function RootRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        {/* Full-screen, outside the shell: signup isn't finished yet. */}
        <Route element={<RequireRole role="DRIVER" />}>
          <Route path="/drive/onboarding" element={<DriverOnboardingPage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route element={<RequireRole role="RIDER" />}>
            <Route path="/ride" element={<RiderHomePage />} />
            <Route path="/ride/history" element={<RiderHistoryPage />} />
          </Route>

          <Route element={<RequireRole role="DRIVER" />}>
            <Route path="/drive" element={<DriverHomePage />} />
            <Route path="/drive/history" element={<DriverHistoryPage />} />
          </Route>

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/rides/:rideId" element={<RideDetailPage />} />
        </Route>

        <Route element={<AppShell wide />}>
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/rides" element={<AdminRidesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
