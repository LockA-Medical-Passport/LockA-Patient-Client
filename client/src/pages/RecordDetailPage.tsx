import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatRecordCategory, formatRecordDate, formatRecordStatus } from '../components/records/format'
import { Button, Card, Spinner } from '../components/ui'
import { useRecordContentClient, verifyRecordIntegrity, type RecordContent } from '../lib/records'
import { describeUnknownError, useSorobanClient, type MedicalRecord } from '../lib/soroban'

type DetailState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; record: MedicalRecord; content: RecordContent; isVerified: boolean }

function displayKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function RecordBody({ content }: { content: RecordContent }) {
  if (content.contentType.includes('json')) {
    try {
      const parsed = JSON.parse(content.content) as unknown
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return (
          <dl className="divide-y divide-blue-900/20">
            {Object.entries(parsed).map(([key, value]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-1 sm:gap-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{displayKey(key)}</dt>
                <dd className="text-sm text-slate-200 break-words">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        )
      }
    } catch {
      // Fall through to exact plain-text rendering.
    }
  }
  return <pre className="whitespace-pre-wrap break-words text-sm text-slate-200 font-sans">{content.content}</pre>
}

function IntegrityIndicator({ isVerified }: { isVerified: boolean }) {
  if (isVerified) {
    return (
      <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <p className="font-bold text-emerald-300">✓ Verified on-chain</p>
        <p className="text-xs text-slate-300 mt-1">
          This content&apos;s client-computed SHA-256 hash matches its RecordCommitmentRegistry commitment.
        </p>
      </div>
    )
  }
  return (
    <div role="alert" className="rounded-xl border-2 border-red-500 bg-red-950/60 p-5 shadow-lg shadow-red-950/40">
      <p className="text-lg font-extrabold text-red-300">⚠ Hash mismatch — integrity check failed</p>
      <p className="text-sm text-white mt-2">
        Do not rely on this record. The fetched content does not match the commitment stored on-chain.
      </p>
    </div>
  )
}

export function RecordDetailPage() {
  const { id = '' } = useParams()
  const contractClient = useSorobanClient()
  const contentClient = useRecordContentClient()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DetailState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })

    async function load() {
      try {
        const record = await contractClient.getRecord(id)
        if (cancelled) return
        if (!record) {
          setState({ kind: 'not-found' })
          return
        }
        const content = await contentClient.getRecordContent(record)
        const isVerified = await verifyRecordIntegrity(content.content, record.commitment)
        if (!cancelled) setState({ kind: 'ready', record, content, isVerified })
      } catch (error) {
        if (!cancelled) setState({ kind: 'error', message: describeUnknownError(error) })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [attempt, contentClient, contractClient, id])

  if (state.kind === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Card className="p-10 flex flex-col items-center gap-3 text-center">
          <Spinner size={28} />
          <p className="text-sm text-slate-400">Loading and verifying record…</p>
        </Card>
      </div>
    )
  }

  if (state.kind === 'not-found') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Card className="p-10 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Record not found</h1>
          <p className="text-sm text-slate-400 mb-6">This record does not exist or is no longer registered.</p>
          <Link className="btn-secondary px-4 py-2 rounded-lg text-sm inline-flex" to="/records">
            Back to records
          </Link>
        </Card>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Card className="p-10 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Record content unavailable</h1>
          <p className="text-sm text-slate-400 mb-6">{state.message}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => setAttempt((current) => current + 1)}>
              Try again
            </Button>
            <Link className="btn-secondary px-4 py-2 rounded-lg text-sm inline-flex" to="/records">
              Back to records
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const { record, content, isVerified } = state
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link to="/records" className="text-sm text-brand-blue hover:text-blue-300 inline-flex mb-6">
        ← Back to records
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">{record.title}</h1>
        <p className="text-sm text-slate-400">
          {formatRecordCategory(record.category)} · Issued by <span>{record.issuedBy.name}</span> ·{' '}
          {formatRecordDate(record.issuedAt)}
        </p>
        <p className="text-xs text-slate-500 mt-1">Status: {formatRecordStatus(record.status)}</p>
      </div>

      <IntegrityIndicator isVerified={isVerified} />

      <Card className="p-6 mt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Record content</h2>
        <RecordBody content={content} />
      </Card>

      <Card className="p-5 mt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">On-chain commitment</h2>
        <p className="font-mono text-xs text-slate-400 break-all">{record.commitment}</p>
        <p className="text-xs text-slate-600 mt-2">Anchored {formatRecordDate(record.anchoredAt)}</p>
      </Card>
    </div>
  )
}

