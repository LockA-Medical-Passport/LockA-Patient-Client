import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterPassportForm } from './RegisterPassportForm'
import { ToastProvider } from '../toast'
import { createMockClient, MOCK_PATIENT_ADDRESS, SorobanError, SorobanClientProvider } from '../../lib/soroban'
import type { LockaContractClient, Passport } from '../../lib/soroban'

const OWNER = MOCK_PATIENT_ADDRESS
const OTHER_ADDRESS = 'GD3VGFDEWHOR37ZXX4PKQDNED7LKNMAJ4UT47KTH2SLLLJCM62JTWDUY'

function renderForm(overrides: { client?: LockaContractClient; onRegistered?: (passport: Passport) => void } = {}) {
  const client = overrides.client ?? createMockClient({ latencyMs: 0, unregistered: true })
  const onRegistered = overrides.onRegistered ?? vi.fn()

  render(
    <ToastProvider>
      <SorobanClientProvider client={client}>
        <RegisterPassportForm ownerAddress={OWNER} onRegistered={onRegistered} />
      </SorobanClientProvider>
    </ToastProvider>,
  )

  return {
    client,
    onRegistered,
    user: userEvent.setup(),
    commitmentField: () => screen.getByLabelText(/identity commitment/i),
    recoveryField: () => screen.getByLabelText(/recovery address/i),
    // Matches both the idle label and the in-flight "Creating passport…" one.
    submitButton: () => screen.getByRole('button', { name: /creat(e|ing) passport/i }),
  }
}

describe('RegisterPassportForm — defaults', () => {
  it('starts with a generated commitment and the connected wallet as recovery', () => {
    const form = renderForm()

    expect((form.commitmentField() as HTMLInputElement).value).toMatch(/^[0-9a-f]{64}$/)
    expect(form.recoveryField()).toHaveValue(OWNER)
    expect(form.submitButton()).toBeEnabled()
  })

  it('generates a different commitment on request', async () => {
    const form = renderForm()
    const before = (form.commitmentField() as HTMLInputElement).value

    await form.user.click(screen.getByRole('button', { name: /generate a new commitment/i }))

    const after = (form.commitmentField() as HTMLInputElement).value
    expect(after).not.toBe(before)
    expect(after).toMatch(/^[0-9a-f]{64}$/)
  })

  it('offers a way back to the connected wallet after an override', async () => {
    const form = renderForm()
    await form.user.clear(form.recoveryField())
    await form.user.paste(OTHER_ADDRESS)

    await form.user.click(screen.getByRole('button', { name: /use my connected wallet/i }))
    expect(form.recoveryField()).toHaveValue(OWNER)
  })
})

describe('RegisterPassportForm — validation', () => {
  it('blocks submit until the recovery address is a valid Stellar account', async () => {
    const form = renderForm()

    await form.user.clear(form.recoveryField())
    await form.user.paste('0x0000000000000000000000000000000000000000')
    await form.user.tab()

    expect(form.submitButton()).toBeDisabled()
    expect(await screen.findByText(/starting with G/i)).toBeInTheDocument()

    await form.user.clear(form.recoveryField())
    await form.user.paste(OTHER_ADDRESS)
    expect(form.submitButton()).toBeEnabled()
  })

  it('blocks submit on an empty recovery address', async () => {
    const form = renderForm()

    await form.user.clear(form.recoveryField())
    await form.user.tab()

    expect(form.submitButton()).toBeDisabled()
    expect(await screen.findByText(/recovery address is required/i)).toBeInTheDocument()
  })

  it('blocks submit on a malformed identity commitment', async () => {
    const form = renderForm()

    await form.user.clear(form.commitmentField())
    await form.user.paste('deadbeef')
    await form.user.tab()

    expect(form.submitButton()).toBeDisabled()
    expect(await screen.findByText(/64 characters/i)).toBeInTheDocument()
  })

  it('stays quiet about fields the patient has not touched', () => {
    renderForm()
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument()
  })
})

describe('RegisterPassportForm — submission', () => {
  it('registers with normalised values and reports the new passport', async () => {
    const client = createMockClient({ latencyMs: 0, unregistered: true })
    const registerPassport = vi.spyOn(client, 'registerPassport')
    const form = renderForm({ client })

    await form.user.clear(form.commitmentField())
    await form.user.paste(`0x${'AB'.repeat(32)}`)
    await form.user.clear(form.recoveryField())
    await form.user.paste(`  ${OTHER_ADDRESS}  `)
    await form.user.click(form.submitButton())

    await waitFor(() => expect(registerPassport).toHaveBeenCalledTimes(1))
    expect(registerPassport).toHaveBeenCalledWith({
      owner: OWNER,
      identityCommitment: 'ab'.repeat(32),
      recoveryAddress: OTHER_ADDRESS,
    })
    await waitFor(() => expect(form.onRegistered).toHaveBeenCalledTimes(1))
    expect(vi.mocked(form.onRegistered).mock.calls[0][0]).toMatchObject({ owner: OWNER, status: 'active' })
    expect(await screen.findByText('Passport created')).toBeInTheDocument()
  })

  it('shows a loading state and refuses a second submit while the transaction is in flight', async () => {
    let release!: (passport: Passport) => void
    const client = createMockClient({ latencyMs: 0, unregistered: true })
    const registerPassport = vi
      .spyOn(client, 'registerPassport')
      .mockReturnValue(new Promise<Passport>((resolve) => (release = resolve)))
    const form = renderForm({ client })

    await form.user.click(form.submitButton())

    const button = form.submitButton()
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText(/waiting for your signature in freighter/i)).toBeInTheDocument()
    expect(form.commitmentField()).toBeDisabled()

    await form.user.click(button)
    expect(registerPassport).toHaveBeenCalledTimes(1)

    release({
      id: 'passport-mock-1',
      owner: OWNER,
      identityCommitment: 'a'.repeat(64),
      displayName: null,
      registeredAt: '2026-08-20T12:00:00.000Z',
      status: 'active',
      recoveryAddress: OWNER,
    })
    await waitFor(() => expect(form.onRegistered).toHaveBeenCalledTimes(1))
  })

  it('surfaces a rejected signature as an error toast and re-enables the form', async () => {
    const client = createMockClient({ latencyMs: 0, unregistered: true })
    vi.spyOn(client, 'registerPassport').mockRejectedValue(new SorobanError('sign', 'User declined access'))
    const form = renderForm({ client })

    await form.user.click(form.submitButton())

    expect(await screen.findByText('User declined access')).toBeInTheDocument()
    expect(screen.getByText('Registration failed')).toBeInTheDocument()
    expect(form.onRegistered).not.toHaveBeenCalled()
    await waitFor(() => expect(form.submitButton()).toBeEnabled())
  })

  it('surfaces a contract rejection, such as an already-registered wallet', async () => {
    // A registered mock client answers as though this wallet already has a passport.
    const form = renderForm({ client: createMockClient({ latencyMs: 0 }) })

    await form.user.click(form.submitButton())

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument()
    expect(form.onRegistered).not.toHaveBeenCalled()
  })
})
