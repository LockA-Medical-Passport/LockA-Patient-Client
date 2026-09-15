import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateRecoveryAddressForm } from './UpdateRecoveryAddressForm'
import { ToastProvider } from '../toast'
import {
  createMockClient,
  MOCK_PATIENT_ADDRESS,
  MOCK_PROVIDERS,
  SorobanClientProvider,
  SorobanError,
} from '../../lib/soroban'
import type { LockaContractClient, Passport } from '../../lib/soroban'

const CURRENT_RECOVERY = MOCK_PROVIDERS.insurer.address
const NEW_RECOVERY = MOCK_PROVIDERS.hospital.address

const PASSPORT: Passport = {
  id: 'passport-7f3a91',
  owner: MOCK_PATIENT_ADDRESS,
  identityCommitment: 'a'.repeat(64),
  displayName: null,
  registeredAt: '2026-03-04T09:12:00.000Z',
  status: 'active',
  recoveryAddress: CURRENT_RECOVERY,
}

function renderForm(overrides: { client?: LockaContractClient; passport?: Passport; onUpdated?: (p: Passport) => void } = {}) {
  const client = overrides.client ?? createMockClient({ latencyMs: 0 })
  const passport = overrides.passport ?? PASSPORT
  const onUpdated = overrides.onUpdated ?? vi.fn()

  render(
    <ToastProvider>
      <SorobanClientProvider client={client}>
        <UpdateRecoveryAddressForm passport={passport} onUpdated={onUpdated} />
      </SorobanClientProvider>
    </ToastProvider>,
  )

  return {
    client,
    onUpdated,
    user: userEvent.setup(),
    field: () => screen.getByLabelText(/new recovery address/i),
    submitButton: () => screen.getByRole('button', { name: /updat(e|ing) recovery address/i }),
  }
}

describe('UpdateRecoveryAddressForm — validation', () => {
  it('starts empty with submit disabled', () => {
    const form = renderForm()
    expect(form.field()).toHaveValue('')
    expect(form.submitButton()).toBeDisabled()
  })

  it('blocks submit on an invalid Stellar address', async () => {
    const form = renderForm()

    await form.user.type(form.field(), 'not-an-address')
    await form.user.tab()

    expect(form.submitButton()).toBeDisabled()
    expect(await screen.findByText(/starting with G/i)).toBeInTheDocument()
  })

  it('blocks submit when the address matches the one already on file', async () => {
    const form = renderForm()

    await form.user.type(form.field(), CURRENT_RECOVERY)
    await form.user.tab()

    expect(form.submitButton()).toBeDisabled()
    expect(await screen.findByText(/must be different/i)).toBeInTheDocument()
  })

  it('enables submit for a valid, different address', async () => {
    const form = renderForm()

    await form.user.type(form.field(), NEW_RECOVERY)
    await form.user.tab()

    expect(form.submitButton()).toBeEnabled()
  })
})

describe('UpdateRecoveryAddressForm — submission', () => {
  it('submits the new address, toasts success, and clears the field', async () => {
    const client = createMockClient({ latencyMs: 0 })
    const updateRecoveryAddress = vi.spyOn(client, 'updateRecoveryAddress')
    const form = renderForm({ client })

    await form.user.type(form.field(), NEW_RECOVERY)
    await form.user.click(form.submitButton())

    await waitFor(() => expect(updateRecoveryAddress).toHaveBeenCalledWith({
      owner: PASSPORT.owner,
      recoveryAddress: NEW_RECOVERY,
    }))
    expect(await screen.findByText('Updated')).toBeInTheDocument()
    await waitFor(() => expect(form.field()).toHaveValue(''))
    expect(form.onUpdated).toHaveBeenCalledTimes(1)
    expect(vi.mocked(form.onUpdated).mock.calls[0][0]).toMatchObject({ recoveryAddress: NEW_RECOVERY })
  })

  it('surfaces a submit failure as an error toast and keeps the entered value', async () => {
    const client = createMockClient({ latencyMs: 0 })
    vi.spyOn(client, 'updateRecoveryAddress').mockRejectedValue(new SorobanError('sign', 'User declined access'))
    const form = renderForm({ client })

    await form.user.type(form.field(), NEW_RECOVERY)
    await form.user.click(form.submitButton())

    expect(await screen.findByText('User declined access')).toBeInTheDocument()
    expect(screen.getByText('Update failed')).toBeInTheDocument()
    expect(form.field()).toHaveValue(NEW_RECOVERY)
    expect(form.onUpdated).not.toHaveBeenCalled()
    await waitFor(() => expect(form.submitButton()).toBeEnabled())
  })
})
