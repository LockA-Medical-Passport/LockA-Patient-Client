import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireWallet } from './components/wallet/RequireWallet'
import { Dashboard } from './pages/Dashboard'
import { PassportLayout } from './pages/PassportLayout'
import { PassportPage } from './pages/PassportPage'
import { RegisterPassportPage } from './pages/RegisterPassportPage'
import { RecordsPage } from './pages/RecordsPage'
import { RecordDetailPage } from './pages/RecordDetailPage'
import { UploadRecordPage } from './pages/UploadRecordPage'
import { ConsentPage } from './pages/ConsentPage'
import { ActivityPage } from './pages/ActivityPage'
import { SummaryPage } from './pages/SummaryPage'
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
          path="records/upload"
          element={
            <RequireWallet description="Uploads are encrypted to your passport and anchored by your account. Connect Freighter to add a record — LockA never sees your keys.">
              <UploadRecordPage />
            </RequireWallet>
          }
        />
        <Route
          path="records/:id"
          element={
            <RequireWallet description="Records are encrypted to your passport. Connect Freighter to decrypt and verify this record — LockA never sees your keys.">
              <RecordDetailPage />
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
        <Route
          path="activity"
          element={
            <RequireWallet description="Your activity feed is tied to your passport. Connect Freighter to see who requested, viewed, or updated your records — LockA never sees your keys.">
              <ActivityPage />
            </RequireWallet>
          }
        />
        <Route
          path="summary"
          element={
            <RequireWallet description="Your AI summary is generated from records you have approved. Connect Freighter to load it — LockA never sees your keys.">
              <SummaryPage />
            </RequireWallet>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
