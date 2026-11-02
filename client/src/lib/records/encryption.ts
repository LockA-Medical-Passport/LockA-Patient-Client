import { bytesToBase64 } from './encoding'

export interface EncryptedRecordContent {
  /** AES-GCM ciphertext, base64-encoded. */
  ciphertext: string
  /** Initialisation vector, base64-encoded. */
  iv: string
  /**
   * STUB: the raw AES key, encoded for the in-memory upload stub only.
   *
   * A real implementation must wrap this key to the patient's passport (for
   * example with an HPKE/public-key scheme agreed with locka-contracts and
   * locka-api) before it leaves the browser. Until that contract exists, the
   * default upload client is a local stub and never sends this over a network.
   */
  keyEnvelope: string
}

const AES_GCM = { name: 'AES-GCM', length: 256 } as const

/** Encrypts the exact plaintext string in the browser before it is uploaded. */
export async function encryptRecordContent(plaintext: string): Promise<EncryptedRecordContent> {
  const key = await globalThis.crypto.subtle.generateKey(AES_GCM, true, ['encrypt', 'decrypt'])
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const plaintextBytes = new TextEncoder().encode(plaintext)
  const encrypted = await globalThis.crypto.subtle.encrypt({ name: AES_GCM.name, iv }, key, plaintextBytes)
  const rawKey = await globalThis.crypto.subtle.exportKey('raw', key)

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    keyEnvelope: bytesToBase64(new Uint8Array(rawKey)),
  }
}
