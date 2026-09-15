import type { ReactNode } from 'react'
import type { Passport } from '../../lib/soroban'
import { Badge, Card } from '../ui'

export interface PassportSummaryProps {
  passport: Passport
}

function formatDate(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-slate-300 text-right">{children}</span>
    </div>
  )
}

export function PassportSummary({ passport }: PassportSummaryProps) {
  return (
    <Card className="glow-blue p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{passport.displayName ?? 'Your patient passport'}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered {formatDate(passport.registeredAt)} on Stellar.
          </p>
        </div>
        <Badge color={passport.status === 'active' ? 'green' : 'amber'}>
          {passport.status === 'active' ? 'Active' : 'Suspended'}
        </Badge>
      </div>

      <div className="divide-y divide-blue-900/20">
        <Row label="Passport ID">
          <span className="font-mono text-xs">{passport.id}</span>
        </Row>
        <Row label="Owner">
          <span className="font-mono text-xs" title={passport.owner}>
            {truncateAddress(passport.owner)}
          </span>
        </Row>
        <Row label="Recovery">
          {passport.recoveryAddress ? (
            <span className="font-mono text-xs" title={passport.recoveryAddress}>
              {truncateAddress(passport.recoveryAddress)}
            </span>
          ) : (
            <span className="text-slate-500 text-xs">Not configured</span>
          )}
        </Row>
        <Row label="Identity commitment">
          <span className="font-mono text-[11px] break-all leading-relaxed">{passport.identityCommitment}</span>
        </Row>
      </div>

      <p className="text-xs text-slate-600 mt-6">
        Your medical records stay encrypted off-chain. Stellar holds only this identity, the consent you
        grant, and the audit trail of who opened what.
      </p>
    </Card>
  )
}
