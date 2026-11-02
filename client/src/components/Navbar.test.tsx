import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useWallet } from '../lib/wallet'

vi.mock('../lib/wallet', async () => {
  const actual = await vi.importActual<typeof import('../lib/wallet')>('../lib/wallet')
  return { ...actual, useWallet: vi.fn() }
})

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
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
  })
})

describe('Navbar', () => {
  it('renders the LockA wordmark and primary nav links', () => {
    renderNavbar()
    expect(screen.getByText('Medical Passport')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Passport' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Records' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Consent' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Summary' })).toBeInTheDocument()
  })

  it('marks the active route link and not the others', () => {
    renderNavbar('/records')
    expect(screen.getByRole('link', { name: 'Records' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active')
  })

  it('marks Dashboard active only on an exact match at "/"', () => {
    renderNavbar('/passport')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Passport' })).toHaveClass('active')
  })

  it('toggles the mobile menu open and closed', () => {
    renderNavbar()
    const toggle = screen.getByRole('button', { name: /toggle menu/i })
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()
  })

  it('shows an enabled Connect Wallet button wired to the wallet hook', () => {
    renderNavbar()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeEnabled()
  })
})
