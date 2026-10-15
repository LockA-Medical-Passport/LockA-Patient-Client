import { Link } from 'react-router-dom'
import type { MedicalRecord } from '../../lib/soroban'
import { Badge, Card, Spinner } from '../ui'
import { formatRecordCategory, formatRecordDate, formatRecordStatus } from './format'

export type ContentAvailability = 'loading' | 'available' | 'unavailable'

const STATUS_COLORS = {
  active: 'green',
  amended: 'amber',
  revoked: 'red',
} as const

export function RecordCard({
  record,
  contentAvailability,
}: {
  record: MedicalRecord
  contentAvailability: ContentAvailability
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-semibold text-white">{record.title}</h2>
            <Badge color="blue">{formatRecordCategory(record.category)}</Badge>
            <Badge color={STATUS_COLORS[record.status]}>{formatRecordStatus(record.status)}</Badge>
          </div>
          <p className="text-sm text-slate-400">{record.issuedBy.name}</p>
        </div>
        <Link
          to={`/records/${encodeURIComponent(record.id)}`}
          className="btn-secondary px-4 py-2 rounded-lg text-sm inline-flex items-center justify-center"
        >
          View record
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap text-xs">
        <p>
          <span className="text-slate-500">Issued: </span>
          <span className="text-slate-300">{formatRecordDate(record.issuedAt)}</span>
        </p>
        {contentAvailability === 'loading' && (
          <span className="inline-flex items-center gap-2 text-slate-500">
            <Spinner size={12} /> Checking content
          </span>
        )}
        {contentAvailability === 'available' && <span className="text-brand-green">Content available</span>}
        {contentAvailability === 'unavailable' && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">
            <span aria-hidden="true">!</span> Content unavailable
          </span>
        )}
      </div>
    </Card>
  )
}

