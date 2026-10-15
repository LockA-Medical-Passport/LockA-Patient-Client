// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MOCK_RECORD_COMMITMENTS, MOCK_RECORD_CONTENTS } from './mockData'
import { sha256Hex, verifyRecordIntegrity } from './integrity'

describe('record integrity', () => {
  it.each(Object.keys(MOCK_RECORD_CONTENTS))('matches %s content to its SHA-256 commitment', async (recordId) => {
    const content = MOCK_RECORD_CONTENTS[recordId]
    const commitment = MOCK_RECORD_COMMITMENTS[recordId]

    await expect(sha256Hex(content)).resolves.toBe(commitment)
    await expect(verifyRecordIntegrity(content, commitment)).resolves.toBe(true)
  })

  it('rejects changed content and malformed commitments', async () => {
    const commitment = MOCK_RECORD_COMMITMENTS['rec-9f21']

    await expect(verifyRecordIntegrity(`${MOCK_RECORD_CONTENTS['rec-9f21']} `, commitment)).resolves.toBe(false)
    await expect(verifyRecordIntegrity(MOCK_RECORD_CONTENTS['rec-9f21'], 'not-a-hash')).resolves.toBe(false)
  })
})

