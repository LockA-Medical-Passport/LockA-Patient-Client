/**
 * Minimal local types for the subset of `qrcode` this app uses.
 *
 * `@types/qrcode` is deliberately not installed: it starts with
 * `/// <reference types="node" />`, which pulls Node's `Buffer` into the
 * global type scope project-wide and breaks the plain `Uint8Array` this app
 * already passes to `StrKey.encodeEd25519PublicKey` elsewhere (see
 * lib/soroban/client.ts) — that call works at runtime; it just isn't a real
 * Node `Buffer`, which the browser bundle doesn't have anyway.
 */
declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

  export interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>

  export interface QRCodeOptions {
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel
  }

  export interface QRCodeBitMatrix {
    size: number
    data: Uint8Array
  }

  export interface QRCode {
    modules: QRCodeBitMatrix
  }

  export function create(text: string, options?: QRCodeOptions): QRCode
}
