import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import * as freighterApi from '@stellar/freighter-api'
import App from './App'
import { AppProviders } from './app/providers'

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  getNetworkDetails: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: false })
})

describe('App', () => {
  it('renders the LockA placeholder page', async () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LockA')
    expect(screen.getByText('Medical Passport')).toBeInTheDocument()
    expect(screen.getByText(/decentralized healthcare identity/i)).toBeInTheDocument()
    // Scoped to the navbar: the dashboard body offers its own connect affordance
    // too once a wallet state is known (see Dashboard.test.tsx), same as every
    // other wallet-gated page.
    const navbar = screen.getByRole('banner')
    await waitFor(() => expect(within(navbar).getByRole('link', { name: /install freighter/i })).toBeInTheDocument())
  })
})
