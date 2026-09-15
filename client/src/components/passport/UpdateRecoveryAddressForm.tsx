import { useState, type FormEvent } from 'react'
import { useToast } from '../toast'
import { validateRecoveryAddress } from '../../lib/passport'
import { describeUnknownError, useSorobanClient, type Passport } from '../../lib/soroban'
import { Button, Card, TextField } from '../ui'

export interface UpdateRecoveryAddressFormProps {
  passport: Passport
  /** Called with the updated passport once the transaction succeeds. */
  onUpdated: (passport: Passport) => void
}

function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address
}

/** Form to change a registered passport's recovery address, reusing the registration flow's validator. */
export function UpdateRecoveryAddressForm({ passport, onUpdated }: UpdateRecoveryAddressFormProps) {
  const client = useSorobanClient()
  const toast = useToast()

  const [recoveryAddress, setRecoveryAddress] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmed = recoveryAddress.trim()
  const validationError = validateRecoveryAddress(recoveryAddress)
  const isUnchanged = trimmed.length > 0 && trimmed === passport.recoveryAddress
  const isValid = !validationError && !isUnchanged

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid || isSubmitting) {
      setTouched(true)
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await client.updateRecoveryAddress({ owner: passport.owner, recoveryAddress: trimmed })
      toast.success('Recovery address updated.', { title: 'Updated' })
      setRecoveryAddress('')
      setTouched(false)
      onUpdated(updated)
    } catch (err) {
      toast.error(describeUnknownError(err), { title: 'Update failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <h2 className="text-lg font-bold text-white mb-2">Recovery address</h2>
        <p className="text-slate-400 text-sm mb-6">
          {passport.recoveryAddress ? (
            <>
              Currently <span className="font-mono text-slate-300">{truncateAddress(passport.recoveryAddress)}</span>.
              Enter a different Stellar account to change who can help recover this passport.
            </>
          ) : (
            'No recovery address is configured. Add a Stellar account that can help recover this passport.'
          )}
        </p>

        <TextField
          label="New recovery address"
          value={recoveryAddress}
          onChange={(event) => setRecoveryAddress(event.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && !isUnchanged ? (validationError ?? undefined) : undefined}
          helperText={
            touched && isUnchanged
              ? 'Must be different from the current recovery address.'
              : 'Stellar account that can recover this passport.'
          }
          placeholder="G..."
          className="font-mono text-xs"
          spellCheck={false}
          autoComplete="off"
          disabled={isSubmitting}
        />

        <div className="mt-6">
          <Button type="submit" disabled={!isValid} loading={isSubmitting} className="w-full py-2.5 font-semibold">
            {isSubmitting ? 'Updating…' : 'Update recovery address'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
