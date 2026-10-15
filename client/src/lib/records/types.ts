import type { MedicalRecord } from '../soroban'

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

