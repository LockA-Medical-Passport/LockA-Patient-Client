import type { ReactNode } from 'react'
import { ToastProvider } from '../components/toast'
import { RecordContentProvider, type RecordContentClient } from '../lib/records'
import { SorobanClientProvider } from '../lib/soroban'
import type { LockaContractClient } from '../lib/soroban'
import { WalletProvider } from '../lib/wallet'

export interface AppProvidersProps {
  children: ReactNode
  /** Overrides the env-selected contract client — for tests and previews. */
  contractClient?: LockaContractClient
  /** Overrides the locka-api record vault client — for tests and previews. */
  recordContentClient?: RecordContentClient
}

/**
 * Every app-wide context, composed in dependency order:
 *
 * 1. `ToastProvider` — outermost, because `WalletProvider` reports connection
 *    failures through `useToast()`.
 * 2. `WalletProvider` — owns the Freighter connection and the network check.
 * 3. `SorobanClientProvider` — the on-chain identity, consent, and commitment client.
 * 4. `RecordContentProvider` — the separate off-chain, decrypted record-content client.
 *
 * Routing stays outside this wrapper so tests can supply their own router.
 */
export function AppProviders({ children, contractClient, recordContentClient }: AppProvidersProps) {
  return (
    <ToastProvider>
      <WalletProvider>
        <SorobanClientProvider client={contractClient}>
          <RecordContentProvider client={recordContentClient}>{children}</RecordContentProvider>
        </SorobanClientProvider>
      </WalletProvider>
    </ToastProvider>
  )
}
