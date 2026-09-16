import { useState } from 'react'
import type { AccessRequest, RecordCategory } from '../../lib/soroban'
import { Badge, Button, Card } from '../ui'
import { formatDuration, formatRecordCategory, formatScopes } from './format'

export interface AccessRequestCardProps {
  request: AccessRequest
  onApprove: (requestId: string, scopes?: RecordCategory[]) => Promise<void>
  onReject: (requestId: string) => Promise<void>
}

type Mode = 'idle' | 'confirm-approve' | 'confirm-reject' | 'limit-scope' | 'confirm-limit'

/** One pending access request with approve / reject / approve-with-limited-scope actions, each behind a confirm step. */
export function AccessRequestCard({ request, onApprove, onReject }: AccessRequestCardProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [selectedScopes, setSelectedScopes] = useState<RecordCategory[]>(request.scopes)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleScope(scope: RecordCategory) {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]))
  }

  async function confirmApprove(scopes?: RecordCategory[]) {
    setIsSubmitting(true)
    try {
      await onApprove(request.id, scopes)
      // On success the parent removes this card from the list — nothing left to reset.
    } catch {
      setMode('idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmReject() {
    setIsSubmitting(true)
    try {
      await onReject(request.id)
    } catch {
      setMode('idle')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm">{request.provider.name}</span>
            <Badge color={request.provider.verified ? 'green' : 'gray'}>
              {request.provider.verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">{request.reason}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
        <div>
          <span className="text-slate-500">Requested scope: </span>
          <span className="text-slate-300">{formatScopes(request.scopes)}</span>
        </div>
        <div>
          <span className="text-slate-500">Requested duration: </span>
          <span className="text-slate-300">{formatDuration(request.requestedAt, request.expiresAt)}</span>
        </div>
      </div>

      {mode === 'idle' && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="success" onClick={() => setMode('confirm-approve')}>
            Approve
          </Button>
          <Button variant="danger" onClick={() => setMode('confirm-reject')}>
            Reject
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedScopes(request.scopes)
              setMode('limit-scope')
            }}
          >
            Limit &amp; approve
          </Button>
        </div>
      )}

      {mode === 'confirm-approve' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-300">
            Approve this request from {request.provider.name} for {formatScopes(request.scopes)}?
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="success" loading={isSubmitting} onClick={() => confirmApprove()}>
              Confirm approve
            </Button>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setMode('idle')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === 'confirm-reject' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-300">Reject this request from {request.provider.name}? This cannot be undone.</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="danger" loading={isSubmitting} onClick={confirmReject}>
              Confirm reject
            </Button>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setMode('idle')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === 'limit-scope' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-300">Choose which record categories to grant:</p>
          <div className="flex flex-col gap-2">
            {request.scopes.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="accent-brand-blue"
                />
                {formatRecordCategory(scope)}
              </label>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" disabled={selectedScopes.length === 0} onClick={() => setMode('confirm-limit')}>
              Continue
            </Button>
            <Button variant="secondary" onClick={() => setMode('idle')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === 'confirm-limit' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-300">
            Approve this request from {request.provider.name} for {formatScopes(selectedScopes)} only?
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="success" loading={isSubmitting} onClick={() => confirmApprove(selectedScopes)}>
              Confirm approve
            </Button>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setMode('limit-scope')}>
              Back
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
