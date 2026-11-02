import type { RecordUploadClient, RecordUploadInput, UploadedRecord } from './types'

export class RecordUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecordUploadError'
  }
}

export interface StubRecordUploadClientOptions {
  /** Artificial upload delay in ms. Pass 0 in tests to skip timers. */
  latencyMs?: number
  /** Forces every upload to reject — for exercising the failure path. */
  failWith?: string
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * STUB — locka-api has not published its record-upload contract yet.
 *
 * This client deliberately does not guess an endpoint or POST shape. It keeps
 * the encrypted payload in memory, reports progress, and returns a record id
 * and storage URI so the commitment can be anchored on-chain in development.
 * Nothing is sent over the network and nothing survives a reload.
 *
 * Replace this with a real HTTP client once locka-api defines:
 *   - the encrypted upload endpoint and request/response body,
 *   - how the content key is wrapped to the patient's passport,
 *   - how the vault returns the exact plaintext represented by the commitment.
 *
 * The form and the `RecordUploadClient` interface stay unchanged when that
 * lands; only this file needs to change.
 */
export function createStubRecordUploadClient({
  latencyMs = 450,
  failWith,
}: StubRecordUploadClientOptions = {}): RecordUploadClient {
  let sequence = 1

  return {
    async uploadRecord(input: RecordUploadInput): Promise<UploadedRecord> {
      if (!input.ciphertext || !input.iv || !input.keyEnvelope) {
        throw new RecordUploadError('The encrypted record is incomplete. Nothing was uploaded.')
      }
      if (!input.patient) {
        throw new RecordUploadError('Connect your wallet before uploading a record.')
      }

      const steps = [0.2, 0.55, 0.85, 1]
      for (const step of steps) {
        await delay(latencyMs / steps.length)
        input.onProgress?.(step)
      }

      if (failWith) {
        throw new RecordUploadError(failWith)
      }

      const recordId = `rec-upload-${Date.now().toString(36)}-${sequence++}`
      return {
        recordId,
        storageUri: `locka://records/${recordId}`,
      }
    },
  }
}
