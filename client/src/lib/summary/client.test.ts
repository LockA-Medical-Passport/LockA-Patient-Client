import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPatientSummaryClient } from './client'

const PATIENT_ID = 'passport/7f 3a91'

function response({
  body = '',
  ok = true,
  status = 200,
}: {
  body?: string
  ok?: boolean
  status?: number
}): Response {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

afterEach(() => vi.unstubAllGlobals())

describe('PatientSummaryClient', () => {
  it('fetches an AI summary from locka-api without using the browser cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        body: JSON.stringify({
          summary: 'A full blood count is within its reference range.',
          generatedAt: '2026-10-12T09:30:00.000Z',
          recordCount: 2,
        }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(createPatientSummaryClient('https://api.locka.example/').getSummary(PATIENT_ID)).resolves.toEqual({
      patientId: PATIENT_ID,
      summary: 'A full blood count is within its reference range.',
      generatedAt: '2026-10-12T09:30:00.000Z',
      recordCount: 2,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.locka.example/patients/passport%2F7f%203a91/summary',
      {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      },
    )
  })

  it('returns null when there are no approved records to summarise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ status: 204 })))

    await expect(createPatientSummaryClient('https://api.locka.example').getSummary(PATIENT_ID)).resolves.toBeNull()
  })

  it('treats an empty summary payload as no summary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ body: JSON.stringify({ summary: '   ' }) })))

    await expect(createPatientSummaryClient('https://api.locka.example').getSummary(PATIENT_ID)).resolves.toBeNull()
  })

  it('reports a missing summary without inventing one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 404 })))

    await expect(createPatientSummaryClient('https://api.locka.example').getSummary(PATIENT_ID)).rejects.toEqual(
      expect.objectContaining({
        message: 'The AI summary is unavailable for this patient.',
        status: 404,
      }),
    )
  })

  it('rejects an invalid API response instead of rendering it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ body: 'not-json' })))

    await expect(createPatientSummaryClient('https://api.locka.example').getSummary(PATIENT_ID)).rejects.toEqual(
      expect.objectContaining({ message: 'The LockA API returned an invalid AI summary.' }),
    )
  })

  it('requires the API base URL to be configured', async () => {
    await expect(createPatientSummaryClient('').getSummary(PATIENT_ID)).rejects.toEqual(
      expect.objectContaining({ message: 'The LockA API base URL is not configured.' }),
    )
  })
})
