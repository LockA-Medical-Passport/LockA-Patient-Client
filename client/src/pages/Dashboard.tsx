import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CopyButton, StatCard } from '../components/ui'
import { WalletButton } from '../components/wallet/WalletButton'
import { describeUnknownError, useSorobanClient, type Passport } from '../lib/soroban'
import { useWallet } from '../lib/wallet'

function truncateId(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value
}

interface DashboardData {
  passport: Passport | null
  recordCount: number
  pendingConsentCount: number
}

interface DashboardState {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
}

function StatSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass rounded-2xl p-5 h-[92px] animate-pulse">
          <div className="h-3 w-20 bg-blue-900/40 rounded mb-4" />
          <div className="h-5 w-12 bg-blue-900/30 rounded" />
        </div>
      ))}
    </div>
  )
}

function ConnectPrompt() {
  return (
    <Card className="glow-blue p-10 text-center">
      <h2 className="text-lg font-bold text-white mb-2">Connect your wallet to get started</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
        Connect Freighter to see your passport status, medical records, and any provider access
        requests waiting on your decision.
      </p>
      <div className="flex justify-center">
        <WalletButton />
      </div>
    </Card>
  )
}

function RegisterPrompt() {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-bold text-white mb-2">You&rsquo;re not registered yet</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
        Create your patient passport to start managing records and provider access.
      </p>
      <Link to="/passport/register" className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold inline-block">
        Register your passport
      </Link>
    </Card>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-lg font-bold text-white mb-2">Could not load your dashboard</h2>
      <p className="text-slate-400 text-sm mb-6">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  )
}

function DashboardSummary({ passport, recordCount, pendingConsentCount }: DashboardData & { passport: Passport }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Passport Status"
          value={<Badge color={passport.status === 'active' ? 'green' : 'amber'}>{passport.status}</Badge>}
        />
        <StatCard
          label="Passport ID"
          value={
            <span className="inline-flex items-center gap-2 font-mono text-sm">
              {truncateId(passport.id)}
              <CopyButton value={passport.id} label="Copy passport ID" />
            </span>
          }
        />
        <StatCard label="Medical Records" value={recordCount} sub="total records" />
        <StatCard
          label="Pending Consent"
          value={pendingConsentCount}
          sub={pendingConsentCount > 0 ? 'awaiting your action' : 'all caught up'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/records" className="glass rounded-xl p-5 text-left hover:border-blue-500/40 transition-all">
          <div className="font-semibold text-white text-sm mb-1">Medical Records</div>
          <div className="text-xs text-slate-500">View and verify your records</div>
        </Link>
        <Link to="/consent" className="glass rounded-xl p-5 text-left hover:border-blue-500/40 transition-all">
          <div className="font-semibold text-white text-sm mb-1">Consent Management</div>
          <div className="text-xs text-slate-500">Review provider access requests</div>
        </Link>
      </div>
    </>
  )
}

function DashboardBody() {
  const { address, isDetecting } = useWallet()
  const client = useSorobanClient()
  const [state, setState] = useState<DashboardState>({ data: null, isLoading: true, error: null })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    if (!address) {
      return
    }

    let cancelled = false
    setState((current) => ({ ...current, isLoading: true, error: null }))

    async function load() {
      try {
        const owner = address as string
        const passport = await client.getPassport(owner)
        if (!passport) {
          if (!cancelled) {
            setState({ data: { passport: null, recordCount: 0, pendingConsentCount: 0 }, isLoading: false, error: null })
          }
          return
        }

        const [records, accessRequests] = await Promise.all([
          client.listRecords(owner),
          client.listAccessRequests(owner),
        ])
        if (cancelled) {
          return
        }
        setState({
          data: {
            passport,
            recordCount: records.length,
            pendingConsentCount: accessRequests.filter((request) => request.status === 'pending').length,
          },
          isLoading: false,
          error: null,
        })
      } catch (err) {
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: describeUnknownError(err) })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, client, reloadCount])

  if (isDetecting) {
    return <StatSkeleton />
  }
  if (!address) {
    return <ConnectPrompt />
  }
  if (state.isLoading) {
    return <StatSkeleton />
  }
  if (state.error) {
    return <LoadError message={state.error} onRetry={() => setReloadCount((count) => count + 1)} />
  }
  if (!state.data?.passport) {
    return <RegisterPrompt />
  }
  return <DashboardSummary {...state.data} passport={state.data.passport} />
}

export function Dashboard() {
  return (
    <div className="px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <span className="text-white">Lock</span>
            <span className="gradient-text">A</span>
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Decentralized healthcare identity &amp; records platform. Patients control who
            can see their medical history &mdash; on-chain consent, off-chain data.
          </p>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <DashboardBody />
      </div>
    </div>
  )
}
