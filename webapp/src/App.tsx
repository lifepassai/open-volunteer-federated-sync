import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AboutPage } from './pages/AboutPage'
import { AccountPage } from './pages/AccountPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SupportPage } from './pages/SupportPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { WelcomePage } from './pages/WelcomePage'
import { DatasetsPage } from './pages/datasets/DatasetsPage'
import { OpportunityDatasetPage } from './pages/datasets/OpportunityDatasetPage'
import { OrganizationDatasetPage } from './pages/datasets/OrganizationDatasetPage'
import { VolunteerDatasetPage } from './pages/datasets/VolunteerDatasetPage'
import { ListUsersPage } from './pages/manage-users/ListUsersPage'
import { useAccountStore } from './stores/accountStore'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

function HomeRoute() {
  const account = useAccountStore((s) => s.account)
  return account ? <HomePage /> : <WelcomePage />
}

function AdminRoute({ children }: { children: ReactNode }) {
  const account = useAccountStore((s) => s.account)
  if (!account) return <Navigate to="/" replace />
  if (account.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const account = useAccountStore((s) => s.account)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const publicPaths = new Set(['/', '/about', '/terms', '/support'])
    if (!account && !publicPaths.has(location.pathname)) {
      navigate('/', { replace: true })
    }
  }, [account, location.pathname, navigate])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route
          path="/manage-users"
          element={
            <AdminRoute>
              <ListUsersPage />
            </AdminRoute>
          }
        />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/volunteer" element={<VolunteerDatasetPage />} />
        <Route path="/datasets/organization" element={<OrganizationDatasetPage />} />
        <Route path="/datasets/opportunity" element={<OpportunityDatasetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
