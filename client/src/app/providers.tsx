import type { ReactNode } from 'react'
import { ToastProvider } from '../components/toast'
import {
  RecordContentProvider,
  RecordUploadProvider,
  type RecordContentClient,
  type RecordUploadClient,
} from '../lib/records'
import { SorobanClientProvider } from '../lib/soroban'
import type { LockaContractClient } from '../lib/soroban'
import { PatientSummaryProvider, type PatientSummaryClient } from '../lib/summary'
import { WalletProvider } from '../lib/wallet'

export interface AppProvidersProps {
  children: ReactNode
  /** Overrides the env-selected contract client — for tests and previews. */
  contractClient?: LockaContractClient
  /** Overrides the locka-api record vault client — for tests and previews. */
  recordContentClient?: RecordContentClient
  /** Overrides the encrypted upload stub — for tests and previews. */
  recordUploadClient?: RecordUploadClient
  /** Overrides the AI summary client — for tests and previews. */
  patientSummaryClient?: PatientSummaryClient
}

/**
 * Every app-wide context, composed in dependency order:
 *
 * 1. `ToastProvider` — outermost, because `WalletProvider` reports connection
 *    failures through `useToast()`.
 * 2. `WalletProvider` — owns the Freighter connection and the network check.
 * 3. `SorobanClientProvider` — the on-chain identity, consent, and commitment client.
 * 4. `RecordContentProvider` — the separate off-chain, decrypted record-content client.
 * 5. `RecordUploadProvider` — encrypted patient-initiated uploads, stubbed until locka-api
 *    publishes its endpoint.
 * 6. `PatientSummaryProvider` — AI-generated summaries fetched from locka-api, never generated
 *    in the browser.
 *
 * Routing stays outside this wrapper so tests can supply their own router.
 */
export function AppProviders({
  children,
  contractClient,
  recordContentClient,
  recordUploadClient,
  patientSummaryClient,
}: AppProvidersProps) {
  return (
    <ToastProvider>
      <WalletProvider>
        <SorobanClientProvider client={contractClient}>
          <RecordContentProvider client={recordContentClient}>
            <RecordUploadProvider client={recordUploadClient}>
              <PatientSummaryProvider client={patientSummaryClient}>{children}</PatientSummaryProvider>
            </RecordUploadProvider>
          </RecordContentProvider>
        </SorobanClientProvider>
      </WalletProvider>
    </ToastProvider>
  )
}
