import type { PatientSummary, PatientSummaryClient } from './types'

export class PatientSummaryError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PatientSummaryError'
    this.status = status
  }
}

function endpoint(baseUrl: string, patientId: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/patients/${encodeURIComponent(patientId)}/summary`
}

function metadataString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function metadataNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Creates the locka-api client that fetches AI-generated patient summaries. */
export function createPatientSummaryClient(
  baseUrl = import.meta.env.VITE_API_BASE_URL,
): PatientSummaryClient {
  return {
    async getSummary(patientId: string): Promise<PatientSummary | null> {
      if (!baseUrl) {
        throw new PatientSummaryError('The LockA API base URL is not configured.')
      }

      let response: Response
      try {
        response = await fetch(endpoint(baseUrl, patientId), {
          headers: { Accept: 'application/json' },
          credentials: 'include',
          // The refresh action must hit the API, not a stale browser cache.
          cache: 'no-store',
        })
      } catch (error) {
        throw new PatientSummaryError(
          error instanceof Error ? error.message : 'Could not reach the LockA API.',
        )
      }

      if (response.status === 204) {
        return null
      }

      if (!response.ok) {
        throw new PatientSummaryError(
          response.status === 404
            ? 'The AI summary is unavailable for this patient.'
            : 'Could not retrieve the AI summary.',
          response.status,
        )
      }

      const raw = await response.text()
      if (!raw.trim()) {
        return null
      }

      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        throw new PatientSummaryError('The LockA API returned an invalid AI summary.')
      }

      if (!payload || typeof payload !== 'object') {
        throw new PatientSummaryError('The LockA API returned an invalid AI summary.')
      }

      const record = payload as Record<string, unknown>
      const summary = metadataString(record.summary)
      if (!summary) {
        return null
      }

      return {
        patientId,
        summary,
        generatedAt: metadataString(record.generatedAt),
        recordCount: metadataNumber(record.recordCount),
      }
    },
  }
}
