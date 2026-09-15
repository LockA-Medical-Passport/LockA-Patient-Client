import { useState, type FormEvent } from 'react'
import { useToast } from '../toast'
import {
  generateIdentityCommitment,
  normalizeIdentityCommitment,
  validateIdentityCommitment,
  validateRecoveryAddress,
} from '../../lib/passport'
import { describeUnknownError, useSorobanClient, type Passport } from '../../lib/soroban'
import { Button, Card, TextField } from '../ui'

export interface RegisterPassportFormProps {
  /** The connected wallet — it becomes the passport's owner. */
  ownerAddress: string
  /** Called with the new passport once the registration transaction succeeds. */
  onRegistered: (passport: Passport) => void
}

export function RegisterPassportForm({ ownerAddress, onRegistered }: RegisterPassportFormProps) {
  const client = useSorobanClient()
  const toast = useToast()

  const [identityCommitment, setIdentityCommitment] = useState(generateIdentityCommitment)
  const [recoveryAddress, setRecoveryAddress] = useState(ownerAddress)
  const [touched, setTouched] = useState({ identityCommitment: false, recoveryAddress: false })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const commitmentError = validateIdentityCommitment(identityCommitment)
  const recoveryError = validateRecoveryAddress(recoveryAddress)
  const isValid = !commitmentError && !recoveryError

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || isSubmitting) {
      setTouched({ identityCommitment: true, recoveryAddress: true })
      return
    }

    setIsSubmitting(true)
    try {
      const passport = await client.registerPassport({
        owner: ownerAddress,
        identityCommitment: normalizeIdentityCommitment(identityCommitment),
        recoveryAddress: recoveryAddress.trim(),
      })
      toast.success('Your patient passport is live on Stellar.', { title: 'Passport created' })
      // Leaves `isSubmitting` set: the caller navigates away, and the button
      // must not flick back to enabled in the meantime.
      onRegistered(passport)
    } catch (err) {
      toast.error(describeUnknownError(err), { title: 'Registration failed' })
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="glow-blue p-6 sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="text-xl font-bold text-white mb-2">Create your patient passport</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your passport is the on-chain identity that providers request access against. Only an identity
          commitment and a recovery address are stored on Stellar &mdash; never your name, your records, or
          anything else about you.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <TextField
              label="Identity commitment"
              value={identityCommitment}
              onChange={(event) => setIdentityCommitment(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, identityCommitment: true }))}
              error={touched.identityCommitment ? (commitmentError ?? undefined) : undefined}
              helperText="32 random bytes, hex-encoded. Blinded, so it reveals nothing about you."
              className="font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setIdentityCommitment(generateIdentityCommitment())}
              disabled={isSubmitting}
              className="mt-2 text-xs font-semibold text-brand-cyan hover:text-brand-blue disabled:opacity-50"
            >
              Generate a new commitment
            </button>
          </div>

          <div>
            <TextField
              label="Recovery address"
              value={recoveryAddress}
              onChange={(event) => setRecoveryAddress(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, recoveryAddress: true }))}
              error={touched.recoveryAddress ? (recoveryError ?? undefined) : undefined}
              helperText="Stellar account that can recover this passport. Defaults to your connected wallet."
              className="font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {recoveryAddress.trim() !== ownerAddress && (
              <button
                type="button"
                onClick={() => setRecoveryAddress(ownerAddress)}
                disabled={isSubmitting}
                className="mt-2 text-xs font-semibold text-brand-cyan hover:text-brand-blue disabled:opacity-50"
              >
                Use my connected wallet
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button type="submit" disabled={!isValid} loading={isSubmitting} className="w-full py-2.5 font-semibold">
            {isSubmitting ? 'Creating passport…' : 'Create passport'}
          </Button>
          <p className="text-xs text-slate-500 text-center" role={isSubmitting ? 'status' : undefined}>
            {isSubmitting
              ? 'Simulating, then waiting for your signature in Freighter, then submitting to Stellar…'
              : 'Freighter will ask you to sign one transaction. Nothing is sent until you approve it.'}
          </p>
        </div>
      </form>
    </Card>
  )
}
