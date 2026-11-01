import type { RecordCategory } from '../soroban'
import { bytesToBase64 } from './encoding'

export const MAX_RECORD_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_RECORD_NOTE_LENGTH = 500

export const ALLOWED_RECORD_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/json',
] as const

export const ALLOWED_RECORD_UPLOAD_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'txt', 'json'] as const

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

function isAllowedType(file: Pick<File, 'name' | 'type'>): boolean {
  const mimeAllowed = (ALLOWED_RECORD_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)
  const extensionAllowed = (ALLOWED_RECORD_UPLOAD_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))
  return mimeAllowed || extensionAllowed
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${bytes} B`
}

/** Returns a clear, user-facing message for the first validation failure. */
export function validateRecordFile(file: File | null): string | null {
  if (!file) {
    return 'Choose a file to upload.'
  }
  if (file.size === 0) {
    return 'That file is empty. Choose a file that contains a record.'
  }
  if (file.size > MAX_RECORD_UPLOAD_BYTES) {
    return `Files must be ${formatFileSize(MAX_RECORD_UPLOAD_BYTES)} or smaller.`
  }
  if (!isAllowedType(file)) {
    return 'Unsupported file type. Upload a PDF, JPEG, PNG, WebP, text, or JSON file.'
  }
  return null
}

export function validateRecordNote(note: string): string | null {
  return note.length > MAX_RECORD_NOTE_LENGTH
    ? `Notes must be ${MAX_RECORD_NOTE_LENGTH} characters or fewer.`
    : null
}

export function isTextLikeFile(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type.startsWith('text/') || file.type === 'application/json' || ['txt', 'json'].includes(extensionOf(file.name))
}

/**
 * Builds the exact plaintext content string that the vault will serve back.
 * Its SHA-256 is the commitment anchored on-chain, so this string is the
 * integrity boundary — changing any field changes the record's hash.
 */
export async function buildRecordContent(
  file: File,
  category: RecordCategory,
  note: string,
  uploadedAt = new Date(),
): Promise<string> {
  const envelope: Record<string, unknown> = {
    title: file.name,
    category,
    note: note.trim() || null,
    fileName: file.name,
    originalContentType: file.type || 'application/octet-stream',
    uploadedAt: uploadedAt.toISOString(),
  }

  if (isTextLikeFile(file)) {
    envelope.text = await file.text()
  } else {
    envelope.data = bytesToBase64(new Uint8Array(await file.arrayBuffer()))
  }

  return JSON.stringify(envelope)
}
