import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecordContentClient } from './client'

const RECORD = { id: 'record/a b', storageUri: 'locka://record/a-b' }

function response({
  body,
  contentType = 'application/json',
  ok = true,
  status = 200,
}: {
  body: string
  contentType?: string
  ok?: boolean
  status?: number
}): Response {
  return {
    ok,
    status,
    headers: { get: () => contentType },
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

afterEach(() => vi.unstubAllGlobals())

describe('RecordContentClient', () => {
  it('retrieves an authenticated JSON content envelope from locka-api', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({ body: JSON.stringify({ content: '{"result":"normal"}', contentType: 'application/json' }) }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(createRecordContentClient('https://api.locka.example/').getRecordContent(RECORD)).resolves.toEqual({
      recordId: RECORD.id,
      content: '{"result":"normal"}',
      contentType: 'application/json',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://api.locka.example/records/record%2Fa%20b/content', {
      headers: { Accept: 'application/json, text/plain' },
      credentials: 'include',
    })
  })

  it('preserves an unwrapped response exactly for client-side hashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ body: 'exact bytes', contentType: 'text/plain; charset=utf-8' })))

    await expect(createRecordContentClient('https://api.locka.example').getRecordContent(RECORD)).resolves.toEqual({
      recordId: RECORD.id,
      content: 'exact bytes',
      contentType: 'text/plain',
    })
  })

  it('reports missing off-chain content without hiding the on-chain record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ body: '', ok: false, status: 404 })))

    await expect(createRecordContentClient('https://api.locka.example').getRecordContent(RECORD)).rejects.toEqual(
      expect.objectContaining({ message: 'Record content is unavailable.', status: 404 }),
    )
  })
})

