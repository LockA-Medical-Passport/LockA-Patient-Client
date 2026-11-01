const CHUNK_SIZE = 0x8000

/** Base64-encodes bytes without spreading a large array into `String.fromCharCode`. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE))
  }
  return btoa(binary)
}
