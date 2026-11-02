import { useEffect, useState } from 'react'
import type { AuditEvent } from '../../lib/soroban'
import { Badge, Button, Card } from '../ui'
import { ActivityIcon } from './ActivityIcon'
import { ACTIVITY_TONE_CLASSES, activityEventMeta } from './eventMeta'
import { formatExactTime, formatRelativeTime } from './format'

export const ACTIVITY_PAGE_SIZE = 8

function shortHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash
}

export function ActivityEventCard({ event, nowMs }: { event: AuditEvent; nowMs: number }) {
  const meta = activityEventMeta(event.kind)

  return (
    <Card className="p-4" data-testid={`activity-event-${event.kind}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${ACTIVITY_TONE_CLASSES[meta.color]}`}
        >
          <ActivityIcon name={meta.icon} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-white">{meta.label}</h2>
                <Badge color={meta.color}>{event.kind.replaceAll('-', ' ')}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400 break-words">
                <span className="text-slate-300">{event.actorLabel}</span>
                {event.subjectId && (
                  <>
                    <span className="text-slate-600"> · </span>
                    <span className="font-mono text-slate-500">{event.subjectId}</span>
                  </>
                )}
              </p>
            </div>

            <time
              dateTime={event.occurredAt}
              title={formatExactTime(event.occurredAt)}
              className="text-xs text-slate-500 whitespace-nowrap cursor-help"
            >
              {formatRelativeTime(event.occurredAt, nowMs)}
            </time>
          </div>

          <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
            <span>Ledger {event.ledger.toLocaleString('en')}</span>
            {event.txHash && (
              <span className="font-mono break-all" title={event.txHash}>
                Tx {shortHash(event.txHash)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export interface ActivityFeedProps {
  events: AuditEvent[]
  /** Injected in tests so relative timestamps are deterministic. */
  nowMs?: number
  pageSize?: number
}

/** Chronological audit feed with a load-more window for long histories. */
export function ActivityFeed({ events, nowMs = Date.now(), pageSize = ACTIVITY_PAGE_SIZE }: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [events, pageSize])

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400 text-sm">No activity yet.</p>
      </Card>
    )
  }

  const visible = events.slice(0, visibleCount)
  const remaining = events.length - visible.length

  return (
    <div>
      <ol className="flex flex-col gap-3" aria-label="Activity timeline">
        {visible.map((event) => (
          <li key={event.id}>
            <ActivityEventCard event={event} nowMs={nowMs} />
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500" aria-live="polite">
          Showing {visible.length} of {events.length} events
        </p>
        {remaining > 0 && (
          <Button variant="secondary" onClick={() => setVisibleCount((current) => current + pageSize)}>
            Load {Math.min(pageSize, remaining)} more
          </Button>
        )}
      </div>
    </div>
  )
}
