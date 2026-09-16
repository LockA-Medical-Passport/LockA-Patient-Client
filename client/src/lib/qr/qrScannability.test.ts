// @vitest-environment node
/**
 * Proves the QR code `PassportQrCode` renders is genuinely scannable: it runs
 * the same encoder the component uses (`qrcode`'s `create`) and decodes the
 * result with an independent QR reader (`jsqr`), rather than just asserting
 * an <img> exists. `create()` returns the same module matrix `toDataURL`
 * rasterizes into the PNG the component renders — synthesizing a bitmap from
 * it and decoding proves the payload round-trips through a real QR code
 * without needing a canvas or PNG decoder in the test environment.
 */
import { describe, expect, it } from 'vitest'
import * as QRCode from 'qrcode'
import jsQR from 'jsqr'
import { decodePassportQrPayload, encodePassportQrPayload } from './passportPayload'

const MODULE_SCALE = 4
const QUIET_ZONE_MODULES = 4

/** Renders a QR code's module matrix to an RGBA bitmap jsQR can read. */
function modulesToImageData(qr: ReturnType<typeof QRCode.create>): { data: Uint8ClampedArray; size: number } {
  const { size, data: modules } = qr.modules
  const imageSize = (size + QUIET_ZONE_MODULES * 2) * MODULE_SCALE
  const rgba = new Uint8ClampedArray(imageSize * imageSize * 4).fill(255)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) {
        continue
      }
      for (let dy = 0; dy < MODULE_SCALE; dy++) {
        for (let dx = 0; dx < MODULE_SCALE; dx++) {
          const px = (x + QUIET_ZONE_MODULES) * MODULE_SCALE + dx
          const py = (y + QUIET_ZONE_MODULES) * MODULE_SCALE + dy
          const idx = (py * imageSize + px) * 4
          rgba[idx] = 0
          rgba[idx + 1] = 0
          rgba[idx + 2] = 0
          rgba[idx + 3] = 255
        }
      }
    }
  }
  return { data: rgba, size: imageSize }
}

describe('PassportQrCode payload — scannability', () => {
  it('decodes back to the original passport id through a real QR encode/decode round trip', () => {
    const passportId = 'passport-7f3a91'
    const qr = QRCode.create(encodePassportQrPayload(passportId), { errorCorrectionLevel: 'M' })
    const { data, size } = modulesToImageData(qr)

    const decoded = jsQR(data, size, size)

    expect(decoded).not.toBeNull()
    expect(decodePassportQrPayload(decoded!.data)).toBe(passportId)
  })

  it('stays scannable for a longer, real-shaped passport identifier', () => {
    const passportId = `passport-mock-${'a'.repeat(40)}`
    const qr = QRCode.create(encodePassportQrPayload(passportId), { errorCorrectionLevel: 'M' })
    const { data, size } = modulesToImageData(qr)

    const decoded = jsQR(data, size, size)

    expect(decodePassportQrPayload(decoded?.data ?? '')).toBe(passportId)
  })
})
