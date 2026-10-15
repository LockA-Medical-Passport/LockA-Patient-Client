import { useMemo, type ReactNode } from 'react'
import { isMockContractsEnabled } from '../soroban'
import { createRecordContentClient } from './client'
import { RecordContentContext } from './context'
import { createMockRecordContentClient } from './mockClient'
import type { RecordContentClient } from './types'

export interface RecordContentProviderProps {
  children: ReactNode
  client?: RecordContentClient
}

export function RecordContentProvider({ children, client }: RecordContentProviderProps) {
  const value = useMemo(
    () => client ?? (isMockContractsEnabled() ? createMockRecordContentClient() : createRecordContentClient()),
    [client],
  )

  return <RecordContentContext.Provider value={value}>{children}</RecordContentContext.Provider>
}

