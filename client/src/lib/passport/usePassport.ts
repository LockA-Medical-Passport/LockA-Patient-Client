import { useContext } from 'react'
import { PassportContext, type PassportContextValue } from './context'

/** The connected wallet's passport lookup. Must be used inside a PassportProvider. */
export function usePassport(): PassportContextValue {
  const ctx = useContext(PassportContext)
  if (!ctx) {
    throw new Error('usePassport must be used within a PassportProvider')
  }
  return ctx
}
