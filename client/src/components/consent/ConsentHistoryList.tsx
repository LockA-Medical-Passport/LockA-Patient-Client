import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card } from '../ui'
import { formatDateTime, formatScopes } from './format'
import type { ConsentHistoryEntry, ConsentHistoryStatus } from './history'

const PAGE_SIZE = 10
const STATUS_COLORS: Record<ConsentHistoryStatus, 'green' | 'red' | 'amber' | 'gray'> = {
  granted: 'green',
  revoked: 'red',
  rejected: 'gray',
  expired: 'amber',
}

export function ConsentHistoryList({ entries }: { entries: ConsentHistoryEntry[] }) {
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConsentHistoryStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const providerQuery = providerFilter.trim().toLocaleLowerCase()
    return entries.filter(
      (entry) =>
        (statusFilter === 'all' || entry.status === statusFilter) &&
        (!providerQuery || entry.provider.name.toLocaleLowerCase().includes(providerQuery)),
    )
  }, [entries, providerFilter, statusFilter])

  useEffect(() => setPage(1), [providerFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <label className="text-xs text-slate-400">
          <span className="block mb-1.5">Provider</span>
          <input
            className="input-field"
            type="search"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            placeholder="Filter by provider name"
          />
        </label>
        <label className="text-xs text-slate-400">
          <span className="block mb-1.5">Status</span>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ConsentHistoryStatus | 'all')}
          >
            <option value="all">All statuses</option>
            <option value="granted">Granted</option>
            <option value="revoked">Revoked</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm">
            {entries.length === 0 ? 'No consent history yet.' : 'No history matches these filters.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((entry) => (
            <Card key={entry.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h2 className="font-semibold text-white text-sm">{entry.provider.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(entry.occurredAt)}</p>
                </div>
                <Badge color={STATUS_COLORS[entry.status]}>{entry.status}</Badge>
              </div>
              <p className="text-xs">
                <span className="text-slate-500">Scope: </span>
                <span className="text-slate-300">{formatScopes(entry.scopes)}</span>
              </p>
            </Card>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-between mt-5" aria-label="Consent history pages">
          <Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {currentPage} of {pageCount}
          </span>
          <Button variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
            Next
          </Button>
        </nav>
      )}
    </div>
  )
}

