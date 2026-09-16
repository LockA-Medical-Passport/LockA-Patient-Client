// @vitest-environment node
// Pure string logic — no DOM needed.
import { describe, expect, it } from 'vitest'
import { decodePassportQrPayload, encodePassportQrPayload, PASSPORT_QR_PAYLOAD_TYPE } from './passportPayload'

describe('encodePassportQrPayload / decodePassportQrPayload', () => {
  it('round-trips a passport id', () => {
    const encoded = encodePassportQrPayload('passport-7f3a91')
    expect(decodePassportQrPayload(encoded)).toBe('passport-7f3a91')
  })

  it('encodes the documented shape', () => {
    const encoded = encodePassportQrPayload('passport-7f3a91')
    expect(JSON.parse(encoded)).toEqual({ type: PASSPORT_QR_PAYLOAD_TYPE, v: 1, passportId: 'passport-7f3a91' })
  })

  it.each([
    ['a non-JSON string', 'not json at all'],
    ['a JSON array', '[1,2,3]'],
    ['JSON with the wrong type tag', JSON.stringify({ type: 'locka:something-else', v: 1, passportId: 'x' })],
    ['JSON with the wrong version', JSON.stringify({ type: PASSPORT_QR_PAYLOAD_TYPE, v: 2, passportId: 'x' })],
    ['JSON missing passportId', JSON.stringify({ type: PASSPORT_QR_PAYLOAD_TYPE, v: 1 })],
    ['JSON with an empty passportId', JSON.stringify({ type: PASSPORT_QR_PAYLOAD_TYPE, v: 1, passportId: '' })],
    ['JSON with a non-string passportId', JSON.stringify({ type: PASSPORT_QR_PAYLOAD_TYPE, v: 1, passportId: 42 })],
  ])('rejects %s', (_label, raw) => {
    expect(decodePassportQrPayload(raw)).toBeNull()
  })
})
