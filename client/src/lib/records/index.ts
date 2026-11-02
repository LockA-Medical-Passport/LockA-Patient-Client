export { createRecordContentClient, RecordContentError } from './client'
export { createMockRecordContentClient } from './mockClient'
export type { MockRecordContentClientOptions } from './mockClient'
export { MOCK_RECORD_COMMITMENTS, MOCK_RECORD_CONTENTS } from './mockData'
export { RecordContentProvider } from './RecordContentProvider'
export type { RecordContentProviderProps } from './RecordContentProvider'
export { useRecordContentClient } from './useRecordContentClient'
export { RecordUploadProvider } from './RecordUploadProvider'
export type { RecordUploadProviderProps } from './RecordUploadProvider'
export { useRecordUploadClient } from './useRecordUploadClient'
export { createStubRecordUploadClient, RecordUploadError } from './uploadClient'
export type { StubRecordUploadClientOptions } from './uploadClient'
export { encryptRecordContent } from './encryption'
export type { EncryptedRecordContent } from './encryption'
export {
  ALLOWED_RECORD_UPLOAD_EXTENSIONS,
  ALLOWED_RECORD_UPLOAD_MIME_TYPES,
  MAX_RECORD_NOTE_LENGTH,
  MAX_RECORD_UPLOAD_BYTES,
  buildRecordContent,
  formatFileSize,
  isTextLikeFile,
  validateRecordFile,
  validateRecordNote,
} from './uploadContent'
export { sha256Hex, verifyRecordIntegrity } from './integrity'
export type {
  RecordContent,
  RecordContentClient,
  RecordUploadClient,
  RecordUploadInput,
  UploadedRecord,
} from './types'
