import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MOCK_PROVIDERS, SorobanClientProvider, createMockClient } from '../../lib/soroban'
import type { LockaContractClient, Provider, ProviderStatus } from '../../lib/soroban'
import { ProviderBadge } from './ProviderBadge'

function renderBadge(
  badge: ReactNode,
  client: LockaContractClient = createMockClient({ latencyMs: 0 }),
) {
  return render(<SorobanClientProvider client={client}>{badge}</SorobanClientProvider>)
}

function providerWithStatus(status: ProviderStatus): Provider {
  return {
    address: MOCK_PROVIDERS.hospital.address,
    name: 'Example Provider',
    kind: 'hospital',
    status,
    verified: status === 'verified',
  }
}

describe('ProviderBadge', () => {
  it.each([
    ['verified', 'Verified'],
    ['pending', 'Pending'],
    ['suspended', 'Suspended'],
    ['revoked', 'Revoked'],
  ] as const)('renders the %s status as "%s"', (status, label) => {
    renderBadge(<ProviderBadge provider={providerWithStatus(status)} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows the provider kind when asked', () => {
    renderBadge(<ProviderBadge provider={providerWithStatus('verified')} showKind />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Hospital')).toBeInTheDocument()
  })

  it('reads a provider by id from ProviderRegistry', async () => {
    renderBadge(<ProviderBadge providerId={MOCK_PROVIDERS.lab.address} />)
    expect(await screen.findByText('Verified')).toBeInTheDocument()
  })

  it('shows a checking state while a registry lookup is in flight', () => {
    renderBadge(
      <ProviderBadge providerId={MOCK_PROVIDERS.lab.address} />,
      createMockClient({ latencyMs: 20 }),
    )
    expect(screen.getByText('Checking…')).toBeInTheDocument()
  })

  it('shows unknown when the registry lookup fails', async () => {
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'getProvider').mockRejectedValue(new Error('Registry unavailable'))
    renderBadge(<ProviderBadge providerId={MOCK_PROVIDERS.lab.address} showKind />, client)

    expect(await screen.findByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('Registry lookup failed')).toBeInTheDocument()
  })

  it('shows unlisted when the provider is not in the registry', () => {
    renderBadge(<ProviderBadge provider={null} />)
    expect(screen.getByText('Unlisted')).toBeInTheDocument()
  })
})
