import type { Provider, ProviderStatus } from '../../lib/soroban'
import { useProvider } from '../../lib/providers'
import { Badge, type BadgeColor } from '../ui'
import { formatProviderKind } from './providerKind'

const STATUS_PRESENTATION: Record<ProviderStatus, { label: string; color: BadgeColor }> = {
  verified: { label: 'Verified', color: 'green' },
  pending: { label: 'Pending', color: 'amber' },
  suspended: { label: 'Suspended', color: 'red' },
  revoked: { label: 'Revoked', color: 'gray' },
}

export interface ProviderBadgeProps {
  /** A provider already carried by an access request, grant, or record. */
  provider?: Provider | null
  /** A provider address to read from ProviderRegistry with `useProvider`. */
  providerId?: string | null
  /** Shows the provider kind alongside the verification badge. */
  showKind?: boolean
  className?: string
}

/**
 * The single verification badge for every provider shown in the app. It uses
 * the registry status rather than re-deriving trust from `provider.verified`,
 * so new states (pending, suspended, revoked) render consistently everywhere.
 */
export function ProviderBadge({ provider, providerId, showKind = false, className = '' }: ProviderBadgeProps) {
  const lookup = useProvider(provider ? null : providerId)
  const resolved = provider ?? lookup.provider

  if (!resolved) {
    const label = lookup.isLoading ? 'Checking…' : lookup.error ? 'Unknown' : 'Unlisted'
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <Badge color="gray">{label}</Badge>
        {showKind && lookup.error && <span className="text-xs text-slate-500">Registry lookup failed</span>}
      </span>
    )
  }

  const status = STATUS_PRESENTATION[resolved.status] ?? { label: 'Pending', color: 'amber' as const }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Badge color={status.color}>{status.label}</Badge>
      {showKind && <span className="text-xs text-slate-500">{formatProviderKind(resolved.kind)}</span>}
    </span>
  )
}
