import { useEffect, useMemo, useState } from 'react'
import { ActiveGrantCard } from '../components/consent/ActiveGrantCard'
import { AccessRequestCard } from '../components/consent/AccessRequestCard'
import { ConsentHistoryList } from '../components/consent/ConsentHistoryList'
import { buildConsentHistory } from '../components/consent/history'
import { useToast } from '../components/toast'
import { Card, Spinner } from '../components/ui'
import {
  describeUnknownError,
  useSorobanClient,
  type AccessRequest,
  type AuditEvent,
  type ConsentGrant,
  type RecordCategory,
} from '../lib/soroban'
import { useWallet } from '../lib/wallet'

type Tab = 'pending' | 'active' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active Grants' },
  { id: 'history', label: 'History' },
]

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="flex gap-2 mb-6 flex-wrap" role="tablist" aria-label="Consent">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
            active === tab.id
              ? 'bg-blue-500/15 text-brand-blue border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function PendingTab() {
  const { address } = useWallet()
  const client = useSorobanClient()
  const toast = useToast()
  const [requests, setRequests] = useState<AccessRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      return
    }
    let cancelled = false
    setRequests(null)
    setError(null)

    client.listAccessRequests(address).then(
      (all) => {
        if (!cancelled) {
          setRequests(all.filter((request) => request.status === 'pending'))
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(describeUnknownError(err))
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [address, client])

  async function handleApprove(requestId: string, scopes?: RecordCategory[]) {
    try {
      await client.approveAccessRequest({ patient: address as string, requestId, scopes })
      setRequests((current) => current?.filter((request) => request.id !== requestId) ?? current)
      toast.success('Access request approved.', { title: 'Approved' })
    } catch (err) {
      toast.error(describeUnknownError(err), { title: 'Approval failed' })
      throw err
    }
  }

  async function handleReject(requestId: string) {
    try {
      await client.denyAccessRequest({ patient: address as string, requestId })
      setRequests((current) => current?.filter((request) => request.id !== requestId) ?? current)
      toast.success('Access request rejected.', { title: 'Rejected' })
    } catch (err) {
      toast.error(describeUnknownError(err), { title: 'Rejection failed' })
      throw err
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">{error}</p>
      </Card>
    )
  }

  if (requests === null) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <Spinner size={24} />
        <p className="text-sm text-slate-400">Loading pending requests…</p>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">No pending access requests.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((request) => (
        <AccessRequestCard key={request.id} request={request} onApprove={handleApprove} onReject={handleReject} />
      ))}
    </div>
  )
}

function ActiveGrantsTab() {
  const { address } = useWallet()
  const client = useSorobanClient()
  const toast = useToast()
  const [grants, setGrants] = useState<ConsentGrant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(Date.now)

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setGrants(null)
    setError(null)
    client.listConsentGrants(address).then(
      (all) => {
        if (!cancelled) setGrants(all)
      },
      (err: unknown) => {
        if (!cancelled) setError(describeUnknownError(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [address, client])

  // Time-limited grants disappear shortly after their ledger expiry without a refresh or revoke.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const activeGrants = useMemo(
    () =>
      grants?.filter(
        (grant) =>
          grant.status === 'active' &&
          (!grant.expiresAt || Number.isNaN(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) > nowMs),
      ) ?? null,
    [grants, nowMs],
  )

  async function handleRevoke(grant: ConsentGrant) {
    // Optimistic removal makes the permission disappear as soon as the patient confirms.
    setGrants((current) => current?.filter((candidate) => candidate.id !== grant.id) ?? current)
    try {
      await client.revokeConsentGrant({ patient: address as string, grantId: grant.id })
      toast.success(`${grant.provider.name} can no longer access these records.`, { title: 'Access revoked' })
    } catch (err) {
      // Restore the exact grant on failure; the contract remains the source of truth.
      setGrants((current) => {
        if (!current || current.some((candidate) => candidate.id === grant.id)) return current
        return [...current, grant].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))
      })
      toast.error(describeUnknownError(err), { title: 'Revocation failed' })
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">{error}</p>
      </Card>
    )
  }
  if (activeGrants === null) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <Spinner size={24} />
        <p className="text-sm text-slate-400">Loading active grants…</p>
      </Card>
    )
  }
  if (activeGrants.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">No providers currently have access.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {activeGrants.map((grant) => (
        <ActiveGrantCard key={grant.id} grant={grant} nowMs={nowMs} onRevoke={handleRevoke} />
      ))}
    </div>
  )
}

interface HistoryData {
  events: AuditEvent[]
  grants: ConsentGrant[]
  requests: AccessRequest[]
}

function HistoryTab() {
  const { address } = useWallet()
  const client = useSorobanClient()
  const [data, setData] = useState<HistoryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setData(null)
    setError(null)
    Promise.all([
      client.listAuditEvents(address),
      client.listConsentGrants(address),
      client.listAccessRequests(address),
    ]).then(
      ([events, grants, requests]) => {
        if (!cancelled) setData({ events, grants, requests })
      },
      (err: unknown) => {
        if (!cancelled) setError(describeUnknownError(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [address, client])

  const entries = useMemo(
    () => (data ? buildConsentHistory(data.events, data.grants, data.requests) : null),
    [data],
  )

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">{error}</p>
      </Card>
    )
  }
  if (!entries) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <Spinner size={24} />
        <p className="text-sm text-slate-400">Loading consent history…</p>
      </Card>
    )
  }
  return <ConsentHistoryList entries={entries} />
}

export function ConsentPage() {
  const [tab, setTab] = useState<Tab>('pending')

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Consent Management</h1>
        <p className="text-slate-400 text-sm">Review requests, manage live access, and inspect your consent history.</p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'pending' && <PendingTab />}
      {tab === 'active' && <ActiveGrantsTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  )
}
