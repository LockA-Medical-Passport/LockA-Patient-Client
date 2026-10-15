import type { AccessRequest, AuditEvent, ConsentGrant, Provider, RecordCategory } from '../../lib/soroban'

export type ConsentHistoryStatus = 'granted' | 'revoked' | 'rejected' | 'expired'

export interface ConsentHistoryEntry {
  id: string
  subjectId: string
  provider: Provider
  scopes: RecordCategory[]
  status: ConsentHistoryStatus
  occurredAt: string
}

function newestFirst(a: ConsentHistoryEntry, b: ConsentHistoryEntry): number {
  return b.occurredAt.localeCompare(a.occurredAt)
}

/** Joins audit events to consent/request state so every history row has useful context. */
export function buildConsentHistory(
  events: readonly AuditEvent[],
  grants: readonly ConsentGrant[],
  requests: readonly AccessRequest[],
  nowMs = Date.now(),
): ConsentHistoryEntry[] {
  const grantsById = new Map(grants.map((grant) => [grant.id, grant]))
  const grantsByRequestId = new Map(
    grants.filter((grant) => grant.requestId !== null).map((grant) => [grant.requestId as string, grant]),
  )
  const requestsById = new Map(requests.map((request) => [request.id, request]))
  const entries: ConsentHistoryEntry[] = []

  for (const event of events) {
    if (!event.subjectId) {
      continue
    }
    const grant = grantsById.get(event.subjectId) ?? grantsByRequestId.get(event.subjectId)
    const request = requestsById.get(event.subjectId) ?? (grant?.requestId ? requestsById.get(grant.requestId) : undefined)
    const source = grant ?? request
    if (!source) {
      continue
    }

    let status: ConsentHistoryStatus | null = null
    if (event.kind === 'access-approved') status = 'granted'
    if (event.kind === 'access-revoked') status = 'revoked'
    if (event.kind === 'access-denied') status = 'rejected'
    if (!status) {
      continue
    }

    entries.push({
      id: event.id,
      subjectId: grant?.id ?? request?.id ?? event.subjectId,
      provider: source.provider,
      scopes: source.scopes,
      status,
      occurredAt: event.occurredAt,
    })
  }

  for (const grant of grants) {
    const hasGranted = entries.some((entry) => entry.subjectId === grant.id && entry.status === 'granted')
    if (!hasGranted) {
      entries.push({
        id: `grant-created-${grant.id}`,
        subjectId: grant.id,
        provider: grant.provider,
        scopes: grant.scopes,
        status: 'granted',
        occurredAt: grant.grantedAt,
      })
    }

    const hasRevoked = entries.some((entry) => entry.subjectId === grant.id && entry.status === 'revoked')
    if (grant.revokedAt && !hasRevoked) {
      entries.push({
        id: `grant-revoked-${grant.id}`,
        subjectId: grant.id,
        provider: grant.provider,
        scopes: grant.scopes,
        status: 'revoked',
        occurredAt: grant.revokedAt,
      })
    }

    const expiryMs = grant.expiresAt ? Date.parse(grant.expiresAt) : Number.NaN
    const isExpired = grant.status === 'expired' || (!Number.isNaN(expiryMs) && expiryMs <= nowMs)
    const wasRevokedFirst = grant.revokedAt && !Number.isNaN(expiryMs) && Date.parse(grant.revokedAt) <= expiryMs
    if (isExpired && grant.expiresAt && !wasRevokedFirst) {
      entries.push({
        id: `grant-expired-${grant.id}`,
        subjectId: grant.id,
        provider: grant.provider,
        scopes: grant.scopes,
        status: 'expired',
        occurredAt: grant.expiresAt,
      })
    }
  }

  return entries.sort(newestFirst)
}

