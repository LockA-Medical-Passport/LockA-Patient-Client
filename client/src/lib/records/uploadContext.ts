import { createContext } from 'react'
import type { RecordUploadClient } from './types'

export const RecordUploadContext = createContext<RecordUploadClient | null>(null)
