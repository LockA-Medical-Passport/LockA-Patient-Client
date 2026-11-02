import type { MedicalRecord, RecordCategory } from '../soroban'

/** The exact decrypted bytes returned by locka-api, represented as UTF-8 text. */
export interface RecordContent {
  recordId: string
  content: string
  contentType: string
}

/** Off-chain half of a medical record. On-chain metadata stays in the Soroban client. */
export interface RecordContentClient {
  getRecordContent(record: Pick<MedicalRecord, 'id' | 'storageUri'>): Promise<RecordContent>
}

/** An encrypted blob on its way to locka-api, before the commitment is anchored. */
export interface RecordUploadInput {
  patient: string
  fileName: string
  category: RecordCategory
  note: string | null
  /** MIME type of the original file the patient picked. */
  originalContentType: string
  /** Original file size in bytes, for upload accounting. */
  size: number
  /** Hex SHA-256 of the exact plaintext content the vault will later return. */
  commitment: string
  /** AES-GCM ciphertext, base64-encoded. */
  ciphertext: string
  /** AES-GCM initialisation vector, base64-encoded. */
  iv: string
  /**
   * STUB key envelope. A real locka-api contract must define how the content
   * key is wrapped to the patient's passport before this replaces plaintext
   * key delivery — see `encryptRecordContent` and `uploadClient.ts`.
   */
  keyEnvelope: string
  /** MIME type of the decrypted content the vault returns (the JSON envelope). */
  contentType: string
  /** 0…1 progress callback, for the upload indicator. */
  onProgress?: (progress: number) => void
}

export interface UploadedRecord {
  recordId: string
  storageUri: string
}

/**
 * Off-chain upload half of patient-initiated records. The default implementation
 * is an explicit stub until locka-api publishes its upload endpoint.
 */
export interface RecordUploadClient {
  uploadRecord(input: RecordUploadInput): Promise<UploadedRecord>
}

