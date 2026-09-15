import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireWallet } from './components/wallet/RequireWallet'
import { Dashboard } from './pages/Dashboard'
import { PassportLayout } from './pages/PassportLayout'
import { PassportPage } from './pages/PassportPage'
import { RegisterPassportPage } from './pages/RegisterPassportPage'
import { RecordsPage } from './pages/RecordsPage'
import { ConsentPage } from './pages/ConsentPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public: the dashboard explains LockA before you commit a wallet to it. */}
        <Route index element={<Dashboard />} />
        <Route path="passport" element={<PassportLayout />}>
          <Route index element={<PassportPage />} />
          <Route path="register" element={<RegisterPassportPage />} />
        </Route>
        <Route
          path="records"
          element={
            <RequireWallet description="Records are encrypted to your passport. Connect Freighter to decrypt and browse them — LockA never sees your keys.">
              <RecordsPage />
            </RequireWallet>
          }
        />
        <Route
          path="consent"
          element={
            <RequireWallet description="Approving or revoking provider access is signed by your account. Connect Freighter to manage consent — LockA never sees your keys.">
              <ConsentPage />
            </RequireWallet>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
