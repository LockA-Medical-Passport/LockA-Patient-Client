import { MOCK_RECORD_CONTENTS } from './mockData'
import { RecordContentError } from './client'
import type { RecordContentClient } from './types'

export interface MockRecordContentClientOptions {
  latencyMs?: number
  /** Record ids whose off-chain fetch should fail while the commitment remains visible. */
  unavailableRecordIds?: readonly string[]
  contents?: Readonly<Record<string, string>>
}

export function createMockRecordContentClient({
  latencyMs = 120,
  unavailableRecordIds = [],
  contents = MOCK_RECORD_CONTENTS,
}: MockRecordContentClientOptions = {}): RecordContentClient {
  return {
    async getRecordContent(record) {
      if (latencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, latencyMs))
      }
      if (unavailableRecordIds.includes(record.id) || contents[record.id] === undefined) {
        throw new RecordContentError('Record content is unavailable.', 404)
      }
      return {
        recordId: record.id,
        content: contents[record.id],
        contentType: 'application/json',
      }
    },
  }
}

