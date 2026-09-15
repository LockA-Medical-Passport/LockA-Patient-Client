import { Outlet } from 'react-router-dom'
import { RequireWallet } from '../components/wallet/RequireWallet'
import { PassportProvider } from '../lib/passport'

/**
 * Shared shell for `/passport` and `/passport/register`: one wallet gate and
 * one passport lookup for both, so navigating between them costs no round trip
 * and neither can disagree about whether a passport exists.
 */
export function PassportLayout() {
  return (
    <RequireWallet description="Your passport lives on Stellar under your account. Connect Freighter to create or view it — LockA never sees your keys.">
      <PassportProvider>
        <div className="max-w-2xl mx-auto px-6 py-16">
          <Outlet />
        </div>
      </PassportProvider>
    </RequireWallet>
  )
}
