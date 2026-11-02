import { useMemo, type ReactNode } from 'react'
import { isMockContractsEnabled } from '../soroban'
import { createPatientSummaryClient } from './client'
import { PatientSummaryContext } from './context'
import { createMockPatientSummaryClient } from './mockClient'
import type { PatientSummaryClient } from './types'

export interface PatientSummaryProviderProps {
  children: ReactNode
  client?: PatientSummaryClient
}

export function PatientSummaryProvider({ children, client }: PatientSummaryProviderProps) {
  const value = useMemo(
    () =>
      client ??
      (isMockContractsEnabled()
        ? createMockPatientSummaryClient()
        : createPatientSummaryClient()),
    [client],
  )

  return <PatientSummaryContext.Provider value={value}>{children}</PatientSummaryContext.Provider>
}
