function normaliseCommitment(commitment: string): string {
  return commitment.trim().toLowerCase().replace(/^sha256:/, '').replace(/^0x/, '')
}

/** Hashes the exact UTF-8 content bytes in the browser. */
export async function sha256Hex(content: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Never trusts an API-supplied verification flag; comparison always happens locally. */
export async function verifyRecordIntegrity(content: string, commitment: string): Promise<boolean> {
  const expected = normaliseCommitment(commitment)
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    return false
  }
  return (await sha256Hex(content)) === expected
}

