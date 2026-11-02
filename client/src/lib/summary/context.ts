import { createContext } from 'react'
import type { PatientSummaryClient } from './types'

export const PatientSummaryContext = createContext<PatientSummaryClient | null>(null)
