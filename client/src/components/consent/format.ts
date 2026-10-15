import type { RecordCategory } from '../../lib/soroban'

const CATEGORY_LABELS: Record<RecordCategory, string> = {
  'lab-result': 'Lab Results',
  imaging: 'Imaging',
  prescription: 'Prescriptions',
  'treatment-note': 'Treatment Notes',
  immunization: 'Immunization',
  allergy: 'Allergies',
  other: 'Other',
}

export function formatRecordCategory(category: RecordCategory): string {
  return CATEGORY_LABELS[category] ?? category
}

export function formatScopes(scopes: readonly RecordCategory[]): string {
  return scopes.map(formatRecordCategory).join(', ')
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatGrantExpiry(expiresAt: string | null, nowMs: number): string {
  if (!expiresAt) {
    return 'Until revoked'
  }
  const expiryMs = Date.parse(expiresAt)
  if (Number.isNaN(expiryMs)) {
    return 'Unknown expiry'
  }
  if (expiryMs <= nowMs) {
    return `Expired ${formatDateTime(expiresAt)}`
  }

  const minutes = Math.ceil((expiryMs - nowMs) / 60_000)
  let remaining: string
  if (minutes < 60) {
    remaining = `${minutes} minute${minutes === 1 ? '' : 's'}`
  } else if (minutes < 1_440) {
    const hours = Math.ceil(minutes / 60)
    remaining = `${hours} hour${hours === 1 ? '' : 's'}`
  } else {
    const days = Math.ceil(minutes / 1_440)
    remaining = `${days} day${days === 1 ? '' : 's'}`
  }

  return `${formatDateTime(expiresAt)} (${remaining} remaining)`
}

/** A human duration between two ISO timestamps, e.g. "7 days" or "6 hours". */
export function formatDuration(fromIso: string, toIso: string): string {
  const fromMs = Date.parse(fromIso)
  const toMs = Date.parse(toIso)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) {
    return 'Unknown duration'
  }

  const totalHours = Math.round((toMs - fromMs) / (1000 * 60 * 60))
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? '' : 's'}`
  }
  const days = Math.round(totalHours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
