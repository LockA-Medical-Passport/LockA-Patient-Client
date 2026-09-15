import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as freighterApi from '@stellar/freighter-api'
import { AppRoutes } from '../routes'
import { AppProviders } from '../app/providers'
import { createMockClient, MOCK_PATIENT_ADDRESS, SorobanError } from '../lib/soroban'
import type { LockaContractClient } from '../lib/soroban'

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  getNetworkDetails: vi.fn(),
}))

beforeEach(() => {
  // A wallet that has already authorised this site, so the route guard passes.
  vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true })
  vi.mocked(freighterApi.getAddress).mockResolvedValue({ address: MOCK_PATIENT_ADDRESS })
  vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
    network: 'TESTNET',
    networkPassphrase: 'Test SDF Network ; September 2015',
    networkUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  })
})

function renderAt(path: string, client: LockaContractClient) {
  return render(
    <AppProviders contractClient={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

const unregistered = () => createMockClient({ latencyMs: 0, unregistered: true })
const registered = () => createMockClient({ latencyMs: 0 })

describe('passport registration flow', () => {
  it('sends a wallet without a passport from /passport to the registration form', async () => {
    renderAt('/passport', unregistered())

    expect(await screen.findByRole('heading', { name: /create your patient passport/i })).toBeInTheDocument()
  })

  it('redirects an already-registered wallet away from the registration form', async () => {
    renderAt('/passport/register', registered())

    expect(await screen.findByText(/registered .* on stellar/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /create your patient passport/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create passport/i })).not.toBeInTheDocument()
  })

  it('registers, toasts, and lands on the passport view', async () => {
    const user = userEvent.setup()
    const client = unregistered()
    renderAt('/passport/register', client)

    await user.click(await screen.findByRole('button', { name: /create passport/i }))

    expect(await screen.findByText('Passport created')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /your patient passport/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create passport/i })).not.toBeInTheDocument()

    // The passport it shows is the one the contract client returned.
    const passport = await client.getPassport(MOCK_PATIENT_ADDRESS)
    expect(screen.getByText(passport!.identityCommitment)).toBeInTheDocument()
  })

  it('keeps the patient on the form when the transaction fails', async () => {
    const user = userEvent.setup()
    const client = unregistered()
    vi.spyOn(client, 'registerPassport').mockRejectedValue(
      new SorobanError('submit', 'Transaction submission failed with status ERROR.'),
    )
    renderAt('/passport/register', client)

    await user.click(await screen.findByRole('button', { name: /create passport/i }))

    expect(await screen.findByText(/transaction submission failed/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /create your patient passport/i })).toBeInTheDocument()
  })

  it('shows a retry instead of a redirect when the lookup itself fails', async () => {
    const client = unregistered()
    const getPassport = vi
      .spyOn(client, 'getPassport')
      .mockRejectedValueOnce(new SorobanError('simulation', 'Could not simulate: network unreachable'))
    renderAt('/passport', client)

    expect(await screen.findByRole('heading', { name: /could not reach the passport registry/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /create your patient passport/i })).not.toBeInTheDocument()

    // Retrying re-runs the lookup; this time it answers, and the redirect happens.
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(getPassport).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('heading', { name: /create your patient passport/i })).toBeInTheDocument()
  })
})
