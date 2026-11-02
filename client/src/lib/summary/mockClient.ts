import type { PatientSummary, PatientSummaryClient } from './types'

export const MOCK_PATIENT_SUMMARY: PatientSummary = {
  patientId: 'passport-7f3a91',
  summary:
    'Recent records include a full blood count within its reference range, a chest X-ray with no acute cardiopulmonary abnormality, an amoxicillin prescription, and a tetanus booster. These are assistive highlights from approved records only; discuss any symptoms or treatment decisions with a clinician.',
  generatedAt: '2026-10-12T09:30:00.000Z',
  recordCount: 4,
}

export interface MockPatientSummaryClientOptions {
  latencyMs?: number
  /** Override the response, or pass `null` to simulate no approved records. */
  summary?: PatientSummary | null
  /** Patient ids whose summary fetch should fail. */
  unavailablePatientIds?: readonly string[]
}

/** In-memory summary source for mock-contract mode and tests. */
export function createMockPatientSummaryClient({
  latencyMs = 120,
  summary = MOCK_PATIENT_SUMMARY,
  unavailablePatientIds = [],
}: MockPatientSummaryClientOptions = {}): PatientSummaryClient {
  return {
    async getSummary(patientId) {
      if (latencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, latencyMs))
      }
      if (unavailablePatientIds.includes(patientId)) {
        throw new Error('The AI summary service is unavailable.')
      }
      return summary ? { ...summary, patientId } : null
    },
  }
}
