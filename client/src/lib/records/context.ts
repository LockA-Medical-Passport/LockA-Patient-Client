import { createContext } from 'react'
import type { RecordContentClient } from './types'

export const RecordContentContext = createContext<RecordContentClient | null>(null)

