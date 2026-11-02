import { useMemo, type ReactNode } from 'react'
import { createStubRecordUploadClient } from './uploadClient'
import { RecordUploadContext } from './uploadContext'
import type { RecordUploadClient } from './types'

export interface RecordUploadProviderProps {
  children: ReactNode
  /** Overrides the stub — tests and previews inject their own client. */
  client?: RecordUploadClient
}

export function RecordUploadProvider({ children, client }: RecordUploadProviderProps) {
  const value = useMemo(() => client ?? createStubRecordUploadClient(), [client])
  return <RecordUploadContext.Provider value={value}>{children}</RecordUploadContext.Provider>
}
