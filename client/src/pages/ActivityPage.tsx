import { useEffect, useState } from 'react'
import { ActivityFeed } from '../components/activity/ActivityFeed'
import { Button, Card, Spinner } from '../components/ui'
import { describeUnknownError, useSorobanClient, type AuditEvent } from '../lib/soroban'
import { useWallet } from '../lib/wallet'

export function ActivityPage() {
  const { address } = useWallet()
  const client = useSorobanClient()
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setEvents(null)
    setError(null)

    client.listAuditEvents(address).then(
      (all) => {
        if (!cancelled) setEvents(all)
      },
      (err: unknown) => {
        if (!cancelled) setError(describeUnknownError(err))
      },
    )

    return () => {
      cancelled = true
    }
  }, [address, attempt, client])

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Activity</h1>
        <p className="text-slate-400 text-sm">
          Who requested access, who viewed your records, and when your records changed.
        </p>
      </div>

      {error && (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm mb-5">{error}</p>
          <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
            Try again
          </Button>
        </Card>
      )}

      {!error && events === null && (
        <Card className="p-10 flex flex-col items-center gap-3 text-center">
          <Spinner size={28} />
          <p className="text-sm text-slate-400">Loading your activity…</p>
        </Card>
      )}

      {!error && events !== null && <ActivityFeed events={events} />}
    </div>
  )
}
