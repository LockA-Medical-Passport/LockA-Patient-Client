import { useContext } from 'react'
import type { RecordUploadClient } from './types'
import { RecordUploadContext } from './uploadContext'

export function useRecordUploadClient(): RecordUploadClient {
  const client = useContext(RecordUploadContext)
  if (!client) {
    throw new Error('useRecordUploadClient must be used within a RecordUploadProvider')
  }
  return client
}
