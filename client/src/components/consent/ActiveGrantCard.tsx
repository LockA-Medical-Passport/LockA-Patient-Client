import { useState } from 'react'
import type { ConsentGrant } from '../../lib/soroban'
import { Badge, Button, Card } from '../ui'
import { formatDateTime, formatGrantExpiry, formatScopes } from './format'

export interface ActiveGrantCardProps {
  grant: ConsentGrant
  nowMs: number
  onRevoke: (grant: ConsentGrant) => Promise<void>
}

/** A live grant with an explicit confirmation step before its on-chain revoke. */
export function ActiveGrantCard({ grant, nowMs, onRevoke }: ActiveGrantCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-white text-sm">{grant.provider.name}</h2>
            <Badge color="green">Active</Badge>
          </div>
          <p className="text-xs text-slate-500 capitalize">{grant.provider.kind}</p>
        </div>
        {!isConfirming && (
          <Button variant="danger" onClick={() => setIsConfirming(true)}>
            Revoke access
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-500 mb-1">Scope</dt>
          <dd className="text-slate-300">{formatScopes(grant.scopes)}</dd>
        </div>
        <div>
          <dt className="text-slate-500 mb-1">Granted</dt>
          <dd className="text-slate-300">{formatDateTime(grant.grantedAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500 mb-1">Expiry</dt>
          <dd className={grant.expiresAt ? 'text-brand-amber' : 'text-slate-300'}>
            {formatGrantExpiry(grant.expiresAt, nowMs)}
          </dd>
        </div>
      </dl>

      {isConfirming && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-white mb-1">Revoke {grant.provider.name}&apos;s access?</p>
          <p className="text-xs text-slate-300 mb-4">
            This submits an irreversible on-chain revocation. The provider will immediately lose access to the
            selected record categories.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="danger" onClick={() => onRevoke(grant)}>
              Confirm revoke
            </Button>
            <Button variant="secondary" onClick={() => setIsConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

