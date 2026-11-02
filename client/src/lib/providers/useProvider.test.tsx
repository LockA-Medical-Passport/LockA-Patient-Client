import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MOCK_PROVIDERS, SorobanClientProvider, createMockClient } from '../soroban'
import type { LockaContractClient } from '../soroban'
import { useProvider } from './useProvider'

function wrapperFor(client: LockaContractClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SorobanClientProvider client={client}>{children}</SorobanClientProvider>
  }
}

describe('useProvider', () => {
  it('starts loading and then returns the provider from ProviderRegistry', async () => {
    const client = createMockClient({ latencyMs: 20 })
    const { result } = renderHook(() => useProvider(MOCK_PROVIDERS.lab.address), {
      wrapper: wrapperFor(client),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.provider).toBeNull()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.provider).toMatchObject({
      address: MOCK_PROVIDERS.lab.address,
      name: MOCK_PROVIDERS.lab.name,
      status: 'verified',
    })
    expect(result.current.error).toBeNull()
  })

  it('exposes a lookup error and can retry it', async () => {
    const client = createMockClient({ latencyMs: 0 })
    const getProvider = vi
      .spyOn(client, 'getProvider')
      .mockRejectedValueOnce(new Error('Provider registry is unavailable.'))

    const { result } = renderHook(() => useProvider(MOCK_PROVIDERS.clinic.address), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.error).toBe('Provider registry is unavailable.'))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.provider).toBeNull()

    result.current.reload()

    await waitFor(() => expect(result.current.provider?.name).toBe(MOCK_PROVIDERS.clinic.name))
    expect(getProvider).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })

  it('skips the lookup when there is no provider id', () => {
    const client = createMockClient({ latencyMs: 0 })
    const getProvider = vi.spyOn(client, 'getProvider')
    const { result } = renderHook(() => useProvider(null), { wrapper: wrapperFor(client) })

    expect(result.current).toMatchObject({ provider: null, isLoading: false, error: null })
    expect(getProvider).not.toHaveBeenCalled()
  })

  it('returns null when the registry has no entry for the address', async () => {
    const { result } = renderHook(() => useProvider('GNOPE'), {
      wrapper: wrapperFor(createMockClient({ latencyMs: 0 })),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.provider).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
