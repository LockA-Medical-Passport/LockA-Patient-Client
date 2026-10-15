import { useEffect, useMemo, useState } from 'react'
import { RecordCard, type ContentAvailability } from '../components/records/RecordCard'
import { formatRecordCategory, formatRecordDate } from '../components/records/format'
import { Button, Card, Spinner } from '../components/ui'
import { useRecordContentClient } from '../lib/records'
import {
  describeUnknownError,
  useSorobanClient,
  type MedicalRecord,
  type RecordCategory,
} from '../lib/soroban'
import { useWallet } from '../lib/wallet'

const CATEGORIES: RecordCategory[] = [
  'lab-result',
  'imaging',
  'prescription',
  'treatment-note',
  'immunization',
  'allergy',
  'other',
]

type AvailabilityById = Record<string, ContentAvailability>

export function RecordsPage() {
  const { address } = useWallet()
  const contractClient = useSorobanClient()
  const contentClient = useRecordContentClient()
  const [records, setRecords] = useState<MedicalRecord[] | null>(null)
  const [availability, setAvailability] = useState<AvailabilityById>({})
  const [category, setCategory] = useState<RecordCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setRecords(null)
    setAvailability({})
    setError(null)

    contractClient.listRecords(address).then(
      (all) => {
        if (cancelled) return
        setRecords(all)
        setAvailability(Object.fromEntries(all.map((record) => [record.id, 'loading'])))
        for (const record of all) {
          contentClient.getRecordContent(record).then(
            () => {
              if (!cancelled) setAvailability((current) => ({ ...current, [record.id]: 'available' }))
            },
            () => {
              if (!cancelled) setAvailability((current) => ({ ...current, [record.id]: 'unavailable' }))
            },
          )
        }
      },
      (loadError: unknown) => {
        if (!cancelled) setError(describeUnknownError(loadError))
      },
    )

    return () => {
      cancelled = true
    }
  }, [address, attempt, contentClient, contractClient])

  const filtered = useMemo(() => {
    if (!records) return null
    const normalisedQuery = query.trim().toLocaleLowerCase()
    return records.filter((record) => {
      if (category !== 'all' && record.category !== category) return false
      if (!normalisedQuery) return true
      const searchable = [record.title, record.issuedBy.name, record.issuedAt, formatRecordDate(record.issuedAt)]
        .join(' ')
        .toLocaleLowerCase()
      return searchable.includes(normalisedQuery)
    })
  }, [category, query, records])

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Medical Records</h1>
        <p className="text-slate-400 text-sm">Browse your records and verify their on-chain integrity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_14rem] gap-3 mb-6">
        <label className="text-xs text-slate-400">
          <span className="block mb-1.5">Search records</span>
          <input
            className="input-field"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Provider, title, or date"
          />
        </label>
        <label className="text-xs text-slate-400">
          <span className="block mb-1.5">Category</span>
          <select
            className="input-field"
            value={category}
            onChange={(event) => setCategory(event.target.value as RecordCategory | 'all')}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {formatRecordCategory(item)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm mb-5">{error}</p>
          <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
            Try again
          </Button>
        </Card>
      )}

      {!error && filtered === null && (
        <Card className="p-10 flex flex-col items-center gap-3 text-center">
          <Spinner size={28} />
          <p className="text-sm text-slate-400">Loading medical records…</p>
        </Card>
      )}

      {!error && filtered?.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-slate-400 text-sm">
            {records?.length === 0 ? 'No medical records yet.' : 'No records match your filters.'}
          </p>
        </Card>
      )}

      {!error && filtered && filtered.length > 0 && (
        <div className="flex flex-col gap-4">
          {filtered.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              contentAvailability={availability[record.id] ?? 'loading'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
