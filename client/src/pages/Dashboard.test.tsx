import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { useWallet } from '../lib/wallet'
import type { WalletContextValue } from '../lib/wallet'
import { createMockClient, MOCK_PATIENT_ADDRESS, SorobanClientProvider, SorobanError } from '../lib/soroban'
import type { LockaContractClient } from '../lib/soroban'

vi.mock('../lib/wallet', async () => {
  const actual = await vi.importActual<typeof import('../lib/wallet')>('../lib/wallet')
  return { ...actual, useWallet: vi.fn() }
})

function mockWallet(overrides: Partial<WalletContextValue>) {
  vi.mocked(useWallet).mockReturnValue({
    address: null,
    network: null,
    networkPassphrase: null,
    expectedNetworkPassphrase: 'Test SDF Network ; September 2015',
    isInstalled: true,
    isDetecting: false,
    isConnecting: false,
    isConnected: false,
    isWrongNetwork: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  })
}

function renderDashboard(client: LockaContractClient = createMockClient({ latencyMs: 0 })) {
  return render(
    <SorobanClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </SorobanClientProvider>,
  )
}

afterEach(() => {
  vi.mocked(useWallet).mockReset()
})

describe('Dashboard — disconnected', () => {
  it('shows a connect prompt when no wallet is connected', () => {
    mockWallet({ address: null })
    renderDashboard()

    expect(screen.getByRole('heading', { name: /connect your wallet to get started/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('shows a loading skeleton instead of the connect prompt while still detecting the extension', () => {
    mockWallet({ address: null, isDetecting: true })
    renderDashboard()

    expect(screen.getByRole('status', { name: /loading dashboard summary/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /connect your wallet/i })).not.toBeInTheDocument()
  })
})

describe('Dashboard — connected, unregistered', () => {
  it('prompts registration when the connected wallet has no passport', async () => {
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard(createMockClient({ latencyMs: 0, unregistered: true }))

    expect(await screen.findByRole('heading', { name: /not registered yet/i })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /register your passport/i })
    expect(link).toHaveAttribute('href', '/passport/register')
  })
})

describe('Dashboard — connected, registered', () => {
  it('shows a loading skeleton before the summary resolves, with no blank flash', async () => {
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard(createMockClient({ latencyMs: 20 }))

    expect(screen.getByRole('status', { name: /loading dashboard summary/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())
    expect(screen.queryByRole('status', { name: /loading dashboard summary/i })).not.toBeInTheDocument()
  })

  it('shows the passport status, id, record count, and pending consent count', async () => {
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard()

    expect(await screen.findByText('active')).toBeInTheDocument()
    expect(screen.getByText('passport-7f3a91')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument() // seeded record count
    expect(screen.getByText('2')).toBeInTheDocument() // seeded pending access requests
    expect(screen.getByRole('button', { name: /copy passport id/i })).toBeInTheDocument()
  })

  it('links to the records and consent pages', async () => {
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard()

    await screen.findByText('active')
    expect(screen.getByRole('link', { name: /medical records/i })).toHaveAttribute('href', '/records')
    expect(screen.getByRole('link', { name: /consent management/i })).toHaveAttribute('href', '/consent')
  })

  it('copies the passport id to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard()

    await user.click(await screen.findByRole('button', { name: /copy passport id/i }))
    expect(writeText).toHaveBeenCalledWith('passport-7f3a91')
  })
})

describe('Dashboard — load failure', () => {
  it('shows a retry option when the summary fails to load, and recovers on retry', async () => {
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'getPassport').mockRejectedValueOnce(
      new SorobanError('simulation', 'Could not reach the Soroban RPC server.'),
    )
    const user = userEvent.setup()
    mockWallet({ address: MOCK_PATIENT_ADDRESS })
    renderDashboard(client)

    expect(await screen.findByRole('heading', { name: /could not load your dashboard/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('active')).toBeInTheDocument()
  })
})
