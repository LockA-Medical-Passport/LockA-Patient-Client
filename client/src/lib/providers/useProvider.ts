import { useCallback, useEffect, useState } from 'react'
import { describeUnknownError, useSorobanClient, type Provider } from '../soroban'

export interface UseProviderResult {
  provider: Provider | null
  isLoading: boolean
  error: string | null
  /** Re-runs the registry lookup after a transient failure. */
  reload: () => void
}

/**
 * Reads one provider from the read-only ProviderRegistry. Passing `null` or an
 * empty id skips the lookup, which is useful when a component already has the
 * full provider object from an access request or record.
 */
export function useProvider(providerId: string | null | undefined): UseProviderResult {
  const client = useSorobanClient()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  useEffect(() => {
    if (!providerId) {
      setProvider(null)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setProvider(null)
    setIsLoading(true)
    setError(null)

    client.getProvider(providerId).then(
      (found) => {
        if (cancelled) return
        setProvider(found)
        setIsLoading(false)
      },
      (err: unknown) => {
        if (cancelled) return
        setError(describeUnknownError(err))
        setIsLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [attempt, client, providerId])

  return { provider, isLoading, error, reload }
}
