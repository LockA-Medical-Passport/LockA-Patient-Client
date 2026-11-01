import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuditEvent, AuditEventKind } from '../../lib/soroban'
import { ActivityFeed } from './ActivityFeed'
import { ACTIVITY_EVENT_META } from './eventMeta'
import { formatExactTime } from './format'

const NOW = new Date('2026-11-01T12:00:00.000Z').getTime()

function event(overrides: Partial<AuditEvent> & { kind: AuditEventKind; id: string }): AuditEvent {
  return {
    actor: 'GACTOR',
    actorLabel: 'Lagos General Hospital',
    subjectId: 'subject-1',
    occurredAt: '2026-11-01T10:00:00.000Z',
    ledger: 1_284_907,
    txHash: 'a'.repeat(64),
    ...overrides,
  }
}

describe('ActivityFeed', () => {
  it('renders every audit event kind with its own label, icon, and badge', () => {
    const kinds = Object.keys(ACTIVITY_EVENT_META) as AuditEventKind[]
    render(
      <ActivityFeed
        nowMs={NOW}
        pageSize={kinds.length}
        events={kinds.map((kind, index) => event({ id: `evt-${index}`, kind }))}
      />,
    )

    for (const kind of kinds) {
      const card = screen.getByTestId(`activity-event-${kind}`)
      expect(within(card).getByText(ACTIVITY_EVENT_META[kind].label)).toBeInTheDocument()
      expect(within(card).getByText(kind.replaceAll('-', ' '))).toBeInTheDocument()
      expect(card.querySelector('svg')).toBeInTheDocument()
    }
  })

  it('shows relative timestamps with the exact time available on hover', () => {
    const occurredAt = '2026-11-01T10:00:00.000Z'
    render(<ActivityFeed nowMs={NOW} events={[event({ id: 'evt-1', kind: 'access-requested', occurredAt })]} />)

    const time = screen.getByText('2 hours ago')
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('dateTime', occurredAt)
    expect(time).toHaveAttribute('title', formatExactTime(occurredAt))
  })

  it('loads more events on demand without losing the current ones', async () => {
    const user = userEvent.setup()
    const events = Array.from({ length: 12 }, (_, index) =>
      event({
        id: `evt-${index}`,
        kind: 'record-viewed',
        occurredAt: new Date(NOW - index * 60_000).toISOString(),
      }),
    )

    render(<ActivityFeed events={events} nowMs={NOW} pageSize={8} />)

    expect(screen.getByText('Showing 8 of 12 events')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByText('1 minute ago')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /load 4 more/i }))

    expect(screen.getByText('Showing 12 of 12 events')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('shows an empty state when there is no activity', () => {
    render(<ActivityFeed events={[]} />)
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument()
  })
})
