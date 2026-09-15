import { Navigate, useNavigate } from 'react-router-dom'
import { PassportLoadError, PassportLoading } from '../components/passport/PassportStates'
import { RegisterPassportForm } from '../components/passport/RegisterPassportForm'
import { usePassport } from '../lib/passport'
import { useWallet } from '../lib/wallet'

export function RegisterPassportPage() {
  const { passport, isLoading, error, reload, setPassport } = usePassport()
  const { address } = useWallet()
  const navigate = useNavigate()

  if (isLoading) {
    return <PassportLoading label="Checking whether this wallet already has a passport…" />
  }
  if (error) {
    return <PassportLoadError message={error} onRetry={reload} />
  }
  // One wallet, one passport: registering again would just fail on-chain.
  if (passport) {
    return <Navigate to="/passport" replace />
  }
  // PassportLayout's wallet gate guarantees an address; this keeps the types honest.
  if (!address) {
    return null
  }

  return (
    <RegisterPassportForm
      ownerAddress={address}
      onRegistered={(registered) => {
        setPassport(registered)
        navigate('/passport', { replace: true })
      }}
    />
  )
}
