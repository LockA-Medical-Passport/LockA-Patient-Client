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

describe('ConsentPage — Active Grants tab', () => {
  it('lists live grants with provider, scope, granted date, and expiry countdown', async () => {
    const user = userEvent.setup()
    mockWallet()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /active grants/i }))

    expect(await screen.findByText('Zenith Diagnostics Lab')).toBeInTheDocument()
    expect(screen.getByText('Harmony Family Clinic')).toBeInTheDocument()
    expect(screen.getByText('Lab Results')).toBeInTheDocument()
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/until revoked/i)).toBeInTheDocument()
  })

  it('cancels a revoke at the confirmation step without calling the contract', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const revoke = vi.spyOn(client, 'revokeConsentGrant')
    renderPage(client)

    await user.click(screen.getByRole('tab', { name: /active grants/i }))
    await screen.findByText('Zenith Diagnostics Lab')
    await user.click(screen.getAllByRole('button', { name: /revoke access/i })[0])
    expect(screen.getByText(/irreversible on-chain revocation/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(revoke).not.toHaveBeenCalled()
    expect(screen.getByText('Zenith Diagnostics Lab')).toBeInTheDocument()
  })

  it('revokes optimistically after confirmation and removes the grant', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const revoke = vi.spyOn(client, 'revokeConsentGrant')
    renderPage(client)

    await user.click(screen.getByRole('tab', { name: /active grants/i }))
    await screen.findByText('Zenith Diagnostics Lab')
    await user.click(screen.getAllByRole('button', { name: /revoke access/i })[0])
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }))

    expect(screen.queryByText('Zenith Diagnostics Lab')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(revoke).toHaveBeenCalledWith({ patient: MOCK_PATIENT_ADDRESS, grantId: 'grant-508' }),
    )
    expect(await screen.findByText('Access revoked')).toBeInTheDocument()
  })

  it('restores the grant and shows an error toast when revocation fails', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'revokeConsentGrant').mockRejectedValue(
      new SorobanError('submit', 'Transaction submission failed with status ERROR.'),
    )
    renderPage(client)

    await user.click(screen.getByRole('tab', { name: /active grants/i }))
    await screen.findByText('Zenith Diagnostics Lab')
    await user.click(screen.getAllByRole('button', { name: /revoke access/i })[0])
    await user.click(screen.getByRole('button', { name: /confirm revoke/i }))

    expect(await screen.findByText('Revocation failed')).toBeInTheDocument()
    expect(await screen.findByText('Zenith Diagnostics Lab')).toBeInTheDocument()
  })

  it('does not show a grant whose time limit has elapsed', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    const [grant] = await client.listConsentGrants(MOCK_PATIENT_ADDRESS)
    vi.spyOn(client, 'listConsentGrants').mockResolvedValue([
      { ...grant, status: 'active', expiresAt: '2000-01-01T00:00:00.000Z' },
    ])
    renderPage(client)

    await user.click(screen.getByRole('tab', { name: /active grants/i }))
    expect(await screen.findByText(/no providers currently have access/i)).toBeInTheDocument()
    expect(screen.queryByText(grant.provider.name)).not.toBeInTheDocument()
  })
})

describe('ConsentPage — History tab', () => {
  it('renders provider, scope, status, and timestamp for past consent events', async () => {
    const user = userEvent.setup()
    mockWallet()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(await screen.findAllByText('Zenith Diagnostics Lab')).not.toHaveLength(0)
    expect(screen.getAllByText(/^granted$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^revoked$/i).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/^rejected$/i).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/^expired$/i).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/lab results/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2026/i).length).toBeGreaterThan(0)
  })

  it('filters history by provider and status', async () => {
    const user = userEvent.setup()
    mockWallet()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /history/i }))
    await screen.findAllByText('Zenith Diagnostics Lab')

    await user.type(screen.getByRole('searchbox', { name: /provider/i }), 'Sterling')
    expect(screen.getByText('Sterling Health Insurance')).toBeInTheDocument()
    expect(screen.queryByText('Zenith Diagnostics Lab')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'revoked')
    expect(screen.getByText(/no history matches these filters/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'rejected')
    expect(screen.getByText('Sterling Health Insurance')).toBeInTheDocument()
  })

  it('shows the history empty state', async () => {
    const user = userEvent.setup()
    mockWallet()
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'listAuditEvents').mockResolvedValue([])
    vi.spyOn(client, 'listConsentGrants').mockResolvedValue([])
    vi.spyOn(client, 'listAccessRequests').mockResolvedValue([])
    renderPage(client)

    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(await screen.findByText(/no consent history yet/i)).toBeInTheDocument()
  })
})
