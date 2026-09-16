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
