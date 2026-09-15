import { Navigate } from 'react-router-dom'
import { PassportLoadError, PassportLoading } from '../components/passport/PassportStates'
import { PassportSummary } from '../components/passport/PassportSummary'
import { usePassport } from '../lib/passport'

export function PassportPage() {
  const { passport, isLoading, error, reload } = usePassport()

  if (isLoading) {
    return <PassportLoading label="Looking up your passport…" />
  }
  if (error) {
    return <PassportLoadError message={error} onRetry={reload} />
  }
  // No passport yet — send the patient to registration rather than showing an
  // empty page they would have to navigate out of.
  if (!passport) {
    return <Navigate to="/passport/register" replace />
  }

  return <PassportSummary passport={passport} />
}
