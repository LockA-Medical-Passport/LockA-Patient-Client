import { useContext } from 'react'
import { PatientSummaryContext } from './context'
import type { PatientSummaryClient } from './types'

export function usePatientSummaryClient(): PatientSummaryClient {
  const client = useContext(PatientSummaryContext)
  if (!client) {
    throw new Error('usePatientSummaryClient must be used within a PatientSummaryProvider')
  }
  return client
}
