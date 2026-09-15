import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as freighterApi from '@stellar/freighter-api'
import { AppRoutes } from './routes'
import { AppProviders } from './app/providers'
import { createMockClient } from './lib/soroban'
import type { LockaContractClient } from './lib/soroban'

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  getNetworkDetails: vi.fn(),
}))

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'
const ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Extension present, but this site has not been authorised yet. */
function mockInstalledWallet() {
  vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true })
  vi.mocked(freighterApi.getAddress).mockResolvedValue({ address: '' })
}

/** Makes the mocked extension report an already-authorised account. */
function mockConnectedWallet() {
  vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true })
  vi.mocked(freighterApi.getAddress).mockResolvedValue({ address: ADDRESS })
  vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
    network: 'TESTNET',
    networkPassphrase: TESTNET_PASSPHRASE,
    networkUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  })
}

beforeEach(() => {
  vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: false })
})

/** Routing only — the seeded mock client keeps every route off the network. */
function renderRoutes(path: string, client: LockaContractClient = createMockClient({ latencyMs: 0 })) {
  return render(
    <AppProviders contractClient={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('AppRoutes', () => {
  it.each(['/', '/passport', '/records', '/consent', '/this-route-does-not-exist'])(
    'renders %s without throwing',
    (path) => {
      renderRoutes(path)
      // Navbar (part of the shared Layout) renders on every route, matched or not.
      expect(screen.getByText('Medical Passport')).toBeInTheDocument()
    },
  )

  it('renders the 404 page for an unmatched route', () => {
    renderRoutes('/nowhere')
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the Dashboard heading at the index route', () => {
    renderRoutes('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LockA')
  })

  it('leaves the dashboard readable without a wallet', async () => {
    renderRoutes('/')
    expect(await screen.findByText(/decentralized healthcare identity/i)).toBeInTheDocument()
  })

  it.each(['/passport', '/records', '/consent'])('gates %s behind a connected wallet', async (path) => {
    mockInstalledWallet()
    renderRoutes(path)

    expect(await screen.findByRole('heading', { name: /connect your wallet/i })).toBeInTheDocument()
    expect(screen.queryByText(/land in a follow-up feature issue/i)).not.toBeInTheDocument()
  })

  it('asks a visitor without the extension to install it before gating', async () => {
    renderRoutes('/passport')

    expect(await screen.findByRole('heading', { name: /freighter wallet required/i })).toBeInTheDocument()
    expect(screen.queryByText(/land in a follow-up feature issue/i)).not.toBeInTheDocument()
  })

  it.each([
    ['/records', 'Medical Records'],
    ['/consent', 'Consent Management'],
  ])('renders %s once a wallet is connected', async (path, heading) => {
    mockConnectedWallet()
    renderRoutes(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /connect your wallet/i })).not.toBeInTheDocument()
  })

  it('hands /passport to the passport flow once a wallet is connected', async () => {
    mockConnectedWallet()
    renderRoutes('/passport')

    // Registration, redirects, and the passport view are covered end to end in
    // pages/passportFlow.test.tsx; here it only has to reach the flow at all.
    expect(await screen.findByRole('heading', { name: /amara okafor/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /connect your wallet/i })).not.toBeInTheDocument()
  })
})
