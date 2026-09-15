import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { describeUnknownError, useSorobanClient, type Passport } from '../soroban'
import { useWallet } from '../wallet'
import { PassportContext, type PassportContextValue } from './context'

interface PassportState {
  passport: Passport | null
  isLoading: boolean
  error: string | null
}

/**
 * Looks up the connected wallet's passport once and shares the result with
 * every page under `/passport`, so the registration form and the passport view
 * agree on whether one exists without racing each other for it.
 */
export function PassportProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  const client = useSorobanClient()
  const [state, setState] = useState<PassportState>({ passport: null, isLoading: true, error: null })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (!address) {
      setState({ passport: null, isLoading: false, error: null })
      return
    }

    let cancelled = false
    setState((current) => ({ ...current, isLoading: true, error: null }))

    client.getPassport(address).then(
      (passport) => {
        if (!cancelled) {
          setState({ passport, isLoading: false, error: null })
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setState({ passport: null, isLoading: false, error: describeUnknownError(err) })
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [address, client, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const setPassport = useCallback(
    (passport: Passport) => setState({ passport, isLoading: false, error: null }),
    [],
  )

  const value = useMemo<PassportContextValue>(
    () => ({ ...state, reload, setPassport }),
    [state, reload, setPassport],
  )

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>
}
