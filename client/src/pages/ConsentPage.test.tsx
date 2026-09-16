import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentPage } from './ConsentPage'
import { ToastProvider } from '../components/toast'
import { useWallet } from '../lib/wallet'
import type { WalletContextValue } from '../lib/wallet'
import { createMockClient, MOCK_PATIENT_ADDRESS, SorobanClientProvider, SorobanError } from '../lib/soroban'
import type { LockaContractClient } from '../lib/soroban'

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

function renderPage(client: LockaContractClient = createMockClient({ latencyMs: 0 })) {
  return render(
    <ToastProvider>
      <SorobanClientProvider client={client}>
        <ConsentPage />
      </SorobanClientProvider>
    </ToastProvider>,
  )
}

afterEach(() => {
  vi.mocked(useWallet).mockReset()
})

describe('ConsentPage — Pending tab', () => {
  it('shows an empty state when there are no pending requests', async () => {
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'listAccessRequests').mockResolvedValue([])
    renderPage(client)

    expect(await screen.findByText(/no pending access requests/i)).toBeInTheDocument()
  })

  it('lists pending requests with provider name, verified badge, scope, and duration', async () => {
    mockWallet()
    renderPage()

    expect(await screen.findByText('Lagos General Hospital')).toBeInTheDocument()
    expect(screen.getByText('MedPlus Pharmacy')).toBeInTheDocument()

    const badges = screen.getAllByText(/verified/i)
    expect(badges.some((el) => el.textContent === 'Verified')).toBe(true)
    expect(badges.some((el) => el.textContent === 'Unverified')).toBe(true)

    expect(screen.getByText(/lab results, imaging, treatment notes/i)).toBeInTheDocument()
    expect(screen.getAllByText(/7 days/i).length).toBeGreaterThan(0)
  })

  it('approves a request after confirmation and removes it from the list', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const approveAccessRequest = vi.spyOn(client, 'approveAccessRequest')
    renderPage(client)

    await screen.findByText('Lagos General Hospital')
    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i })
    await user.click(approveButtons[0])
    await user.click(await screen.findByRole('button', { name: /confirm approve/i }))

    await waitFor(() =>
      expect(approveAccessRequest).toHaveBeenCalledWith({
        patient: MOCK_PATIENT_ADDRESS,
        requestId: 'req-1042',
        scopes: undefined,
      }),
    )
    expect(await screen.findByText('Approved')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Lagos General Hospital')).not.toBeInTheDocument())
  })

  it('rejects a request after confirmation and removes it from the list', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const denyAccessRequest = vi.spyOn(client, 'denyAccessRequest')
    renderPage(client)

    await screen.findByText('MedPlus Pharmacy')
    const rejectButtons = screen.getAllByRole('button', { name: /^reject$/i })
    await user.click(rejectButtons[1])
    await user.click(await screen.findByRole('button', { name: /confirm reject/i }))

    await waitFor(() =>
      expect(denyAccessRequest).toHaveBeenCalledWith({ patient: MOCK_PATIENT_ADDRESS, requestId: 'req-1041' }),
    )
    expect(await screen.findByText('Rejected')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('MedPlus Pharmacy')).not.toBeInTheDocument())
  })

  it('approves with a narrowed scope after selecting and confirming', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const approveAccessRequest = vi.spyOn(client, 'approveAccessRequest')
    renderPage(client)

    await screen.findByText('Lagos General Hospital')
    const limitButtons = screen.getAllByRole('button', { name: /limit & approve/i })
    await user.click(limitButtons[0])

    // Uncheck one of the three requested scopes for the hospital's request.
    await user.click(screen.getByRole('checkbox', { name: /imaging/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(await screen.findByRole('button', { name: /confirm approve/i }))

    await waitFor(() =>
      expect(approveAccessRequest).toHaveBeenCalledWith({
        patient: MOCK_PATIENT_ADDRESS,
        requestId: 'req-1042',
        scopes: ['lab-result', 'treatment-note'],
      }),
    )
  })

  it('keeps a request pending and shows an error toast when approval fails', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'approveAccessRequest').mockRejectedValue(
      new SorobanError('submit', 'Transaction submission failed with status ERROR.'),
    )
    renderPage(client)

    await screen.findByText('Lagos General Hospital')
    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i })
    await user.click(approveButtons[0])
    await user.click(await screen.findByRole('button', { name: /confirm approve/i }))

    expect(await screen.findByText('Approval failed')).toBeInTheDocument()
    expect(screen.getByText('Lagos General Hospital')).toBeInTheDocument()
    // Back to the idle action row rather than stuck mid-confirmation.
    expect(await screen.findAllByRole('button', { name: /^approve$/i })).toHaveLength(2)
  })
})

describe('ConsentPage — other tabs', () => {
  it('shows placeholders for the not-yet-built Active Grants and History tabs', async () => {
    const user = userEvent.setup()
    mockWallet()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /active grants/i }))
    expect(screen.getByText(/issue #15/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(screen.getByText(/issue #16/i)).toBeInTheDocument()
  })
})
