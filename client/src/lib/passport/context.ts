import { createContext } from 'react'
import type { Passport } from '../soroban'

export interface PassportContextValue {
  /** The connected wallet's passport, or null when it has none yet. */
  passport: Passport | null
  /** True while the first (or a retried) lookup is in flight. */
  isLoading: boolean
  /** Why the lookup failed, if it did. */
  error: string | null
  /** Re-runs the lookup — for retry buttons. */
  reload: () => void
  /** Adopts a freshly registered passport without another round trip. */
  setPassport: (passport: Passport) => void
}

export const PassportContext = createContext<PassportContextValue | null>(null)
