/**
 * Identity commitments and the validation behind the registration form.
 *
 * A commitment is 32 random bytes, hex-encoded, anchored in the
 * PatientIdentityRegistry as the patient's on-chain identifier. It is blinded
 * on purpose: nothing about the person can be read off it, and no medical data
 * or PII ever reaches the ledger. A later issue may derive it from a passkey or
 * a recovery secret instead of raw randomness — the form and the contract call
 * take it as an opaque hex string either way.
 */
import { StrKey } from '@stellar/stellar-sdk'

const COMMITMENT_BYTES = 32
const COMMITMENT_PATTERN = /^[0-9a-f]{64}$/i

/** Generates a fresh commitment from the platform CSPRNG. */
export function generateIdentityCommitment(): string {
  const bytes = new Uint8Array(COMMITMENT_BYTES)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Trims, drops a pasted `0x` prefix, and lower-cases — the on-chain form. */
export function normalizeIdentityCommitment(value: string): string {
  return value.trim().replace(/^0x/i, '').toLowerCase()
}

export function isValidIdentityCommitment(value: string): boolean {
  return COMMITMENT_PATTERN.test(normalizeIdentityCommitment(value))
}

/** Stellar account addresses are StrKey-encoded and start with `G`. */
export function isValidStellarAddress(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(value.trim())
}

/** Returns a message to show under the field, or null when it is valid. */
export function validateIdentityCommitment(value: string): string | null {
  const normalized = normalizeIdentityCommitment(value)
  if (!normalized) {
    return 'An identity commitment is required.'
  }
  if (!isValidIdentityCommitment(normalized)) {
    return 'Must be 32 bytes in hex — 64 characters, 0-9 and a-f.'
  }
  return null
}

/** Returns a message to show under the field, or null when it is valid. */
export function validateRecoveryAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'A recovery address is required.'
  }
  if (!isValidStellarAddress(trimmed)) {
    return 'Must be a Stellar account address — 56 characters starting with G.'
  }
  return null
}
