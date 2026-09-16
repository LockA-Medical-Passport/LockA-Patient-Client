import { useEffect, useState } from 'react'
import { AccessRequestCard } from '../components/consent/AccessRequestCard'
import { useToast } from '../components/toast'
import { Card, Spinner } from '../components/ui'
import { describeUnknownError, useSorobanClient, type AccessRequest, type RecordCategory } from '../lib/soroban'
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

function ComingSoonTab({ label, issue }: { label: string; issue: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-slate-400 text-sm">{label} lands in a follow-up feature issue — see {issue}.</p>
    </Card>
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

export function ConsentPage() {
  const [tab, setTab] = useState<Tab>('pending')

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Consent Management</h1>
        <p className="text-slate-400 text-sm">Review and respond to provider access requests.</p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'pending' && <PendingTab />}
      {tab === 'active' && <ComingSoonTab label="Active access grants" issue="issue #15" />}
      {tab === 'history' && <ComingSoonTab label="Consent and access history" issue="issue #16" />}
    </div>
  )
}
