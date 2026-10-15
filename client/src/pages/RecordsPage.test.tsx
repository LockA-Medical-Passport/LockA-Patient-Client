import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RecordContentProvider, createMockRecordContentClient } from '../lib/records'
import {
  MOCK_PATIENT_ADDRESS,
  SorobanClientProvider,
  createMockClient,
  type LockaContractClient,
} from '../lib/soroban'
import { useWallet, type WalletContextValue } from '../lib/wallet'
import { RecordsPage } from './RecordsPage'
import type { RecordContentClient } from '../lib/records'

vi.mock('../lib/wallet', async () => {
  const actual = await vi.importActual<typeof import('../lib/wallet')>('../lib/wallet')
  return { ...actual, useWallet: vi.fn() }
})

function mockWallet(overrides: Partial<WalletContextValue> = {}) {
  vi.mocked(useWallet).mockReturnValue({
    address: MOCK_PATIENT_ADDRESS,
    network: null,
    networkPassphrase: null,
    expectedNetworkPassphrase: 'Test SDF Network ; September 2015',
    isInstalled: true,
    isDetecting: false,
    isConnecting: false,
    isConnected: true,
    isWrongNetwork: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  })
}

function renderPage(
  contractClient: LockaContractClient = createMockClient({ latencyMs: 0 }),
  contentClient: RecordContentClient = createMockRecordContentClient({ latencyMs: 0 }),
) {
  return render(
    <MemoryRouter>
      <SorobanClientProvider client={contractClient}>
        <RecordContentProvider client={contentClient}>
          <RecordsPage />
        </RecordContentProvider>
      </SorobanClientProvider>
    </MemoryRouter>,
  )
}

afterEach(() => vi.mocked(useWallet).mockReset())

describe('RecordsPage', () => {
  it('lists records with category, provider, date, status, and content availability', async () => {
    mockWallet()
    renderPage()

    expect(await screen.findByText('Full blood count panel')).toBeInTheDocument()
    expect(screen.getByText('Zenith Diagnostics Lab')).toBeInTheDocument()
    expect(screen.getByText('Chest X-ray report')).toBeInTheDocument()
    expect(screen.getAllByText(/lab results/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/^amended$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/2026/i).length).toBeGreaterThan(0)
    expect(await screen.findAllByText(/content available/i)).toHaveLength(4)
  })

  it('filters by category and searches provider or date', async () => {
    const user = userEvent.setup()
    mockWallet()
    renderPage()
    await screen.findByText('Full blood count panel')

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'prescription')
    expect(screen.getByText(/amoxicillin/i)).toBeInTheDocument()
    expect(screen.queryByText('Full blood count panel')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'all')
    await user.type(screen.getByRole('searchbox', { name: /search records/i }), 'Zenith')
    expect(screen.getByText('Full blood count panel')).toBeInTheDocument()
    expect(screen.queryByText('Chest X-ray report')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: /search records/i }))
    await user.type(screen.getByRole('searchbox', { name: /search records/i }), 'Jun 28, 2026')
    expect(screen.getByText('Chest X-ray report')).toBeInTheDocument()
  })

  it('shows an empty state when the patient has no records', async () => {
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'listRecords').mockResolvedValue([])
    renderPage(client)

    expect(await screen.findByText(/no medical records yet/i)).toBeInTheDocument()
  })

  it('keeps the commitment visible when an off-chain content fetch fails', async () => {
    mockWallet()
    renderPage(
      createMockClient({ latencyMs: 0 }),
      createMockRecordContentClient({ latencyMs: 0, unavailableRecordIds: ['rec-9f21'] }),
    )

    expect(await screen.findByText('Full blood count panel')).toBeInTheDocument()
    expect(await screen.findByText(/content unavailable/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /view record/i })[0]).toHaveAttribute('href', '/records/rec-9f21')
  })
})

