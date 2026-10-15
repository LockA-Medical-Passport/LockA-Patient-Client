import type { RecordContent, RecordContentClient } from './types'

export class RecordContentError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'RecordContentError'
    this.status = status
  }
}

function endpoint(baseUrl: string, recordId: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/records/${encodeURIComponent(recordId)}/content`
}

/** Creates the locka-api client used to retrieve already-authorised, decrypted content. */
export function createRecordContentClient(baseUrl = import.meta.env.VITE_API_BASE_URL): RecordContentClient {
  return {
    async getRecordContent(record): Promise<RecordContent> {
      if (!baseUrl) {
        throw new RecordContentError('The LockA API base URL is not configured.')
      }

      let response: Response
      try {
        response = await fetch(endpoint(baseUrl, record.id), {
          headers: { Accept: 'application/json, text/plain' },
          credentials: 'include',
        })
      } catch (error) {
        throw new RecordContentError(error instanceof Error ? error.message : 'Could not reach the LockA API.')
      }

      if (!response.ok) {
        throw new RecordContentError(
          response.status === 404 ? 'Record content is unavailable.' : 'Could not retrieve record content.',
          response.status,
        )
      }

      const responseType = response.headers.get('content-type') ?? 'text/plain'
      const raw = await response.text()

      if (responseType.includes('application/json')) {
        try {
          const payload = JSON.parse(raw) as { content?: unknown; contentType?: unknown }
          if (typeof payload.content === 'string') {
            return {
              recordId: record.id,
              content: payload.content,
              contentType: typeof payload.contentType === 'string' ? payload.contentType : 'application/json',
            }
          }
        } catch {
          // A raw JSON document is also valid record content; preserve its exact bytes for hashing.
        }
      }

      return { recordId: record.id, content: raw, contentType: responseType.split(';')[0] }
    },
  }
}

