import { useContext } from 'react'
import { RecordContentContext } from './context'
import type { RecordContentClient } from './types'

export function useRecordContentClient(): RecordContentClient {
  const client = useContext(RecordContentContext)
  if (!client) {
    throw new Error('useRecordContentClient must be used within a RecordContentProvider')
  }
  return client
}

