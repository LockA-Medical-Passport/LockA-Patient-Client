/**
 * The payload encoded in a patient's access-request QR code (see
 * `PassportQrCode`) and the corresponding provider-side scanning contract.
 *
 * A scanned code decodes to JSON shaped like:
 *
 * ```json
 * { "type": "locka:passport-id", "v": 1, "passportId": "passport-7f3a91" }
 * ```
 *
 * `passportId` is the patient's `Passport.id` from PatientIdentityRegistry —
 * the same value the patient's dashboard and passport view show, truncated,
 * with a copy-to-clipboard fallback. `type` and `v` let a scanner (or a
 * future LockA QR code for something else) tell payload shapes apart and
 * evolve the format without breaking older scanners; bump `v` for a
 * breaking change to this shape.
 *
 * Cross-repo note for locka-provider-client: this encodes the bare passport
 * identifier, not a short-lived signed request token. LockA-Documentation's
 * provider-access flow (§13.2) only specifies that a provider "searches by
 * QR code, patient passport ID, or patient-approved contact method" — it
 * does not define a signed-token contract, and neither locka-api nor
 * locka-contracts currently expose one. If a signed, time-limited token is
 * wanted instead (so a photographed/leaked code can't be replayed
 * indefinitely), that needs a cross-repo decision with locka-api first; this
 * module is the only place that would need to change on this side.
 */

export const PASSPORT_QR_PAYLOAD_TYPE = 'locka:passport-id'
export const PASSPORT_QR_PAYLOAD_VERSION = 1

export interface PassportQrPayload {
  type: typeof PASSPORT_QR_PAYLOAD_TYPE
  v: typeof PASSPORT_QR_PAYLOAD_VERSION
  passportId: string
}

/** Builds the exact string encoded into the QR code / copy-to-clipboard value. */
export function encodePassportQrPayload(passportId: string): string {
  const payload: PassportQrPayload = {
    type: PASSPORT_QR_PAYLOAD_TYPE,
    v: PASSPORT_QR_PAYLOAD_VERSION,
    passportId,
  }
  return JSON.stringify(payload)
}

/**
 * Parses a scanned or pasted payload back to a passport id, or `null` if it
 * doesn't match the documented shape (wrong JSON, wrong `type`/`v`, or a
 * missing/empty `passportId`).
 */
export function decodePassportQrPayload(raw: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }
  const candidate = parsed as Record<string, unknown>
  if (candidate.type !== PASSPORT_QR_PAYLOAD_TYPE || candidate.v !== PASSPORT_QR_PAYLOAD_VERSION) {
    return null
  }
  return typeof candidate.passportId === 'string' && candidate.passportId.length > 0 ? candidate.passportId : null
}
