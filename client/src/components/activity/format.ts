const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** A compact relative timestamp ("2 hours ago") for the activity feed. */
export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const thenMs = Date.parse(iso)
  if (Number.isNaN(thenMs)) {
    return 'Unknown time'
  }

  const diff = Math.max(0, nowMs - thenMs)
  if (diff < MINUTE) {
    return 'just now'
  }

  const units: { label: string; ms: number }[] = [
    { label: 'minute', ms: MINUTE },
    { label: 'hour', ms: HOUR },
    { label: 'day', ms: DAY },
    { label: 'month', ms: 30 * DAY },
    { label: 'year', ms: 365 * DAY },
  ]

  let chosen = units[0]
  for (const unit of units) {
    if (diff >= unit.ms) {
      chosen = unit
    }
  }

  const value = Math.max(1, Math.floor(diff / chosen.ms))
  return `${value} ${chosen.label}${value === 1 ? '' : 's'} ago`
}

/** The exact, hoverable timestamp behind a relative one. */
export function formatExactTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}
