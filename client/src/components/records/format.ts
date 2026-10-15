import type { MedicalRecordStatus, RecordCategory } from '../../lib/soroban'

const CATEGORY_LABELS: Record<RecordCategory, string> = {
  'lab-result': 'Lab Results',
  imaging: 'Imaging',
  prescription: 'Prescriptions',
  'treatment-note': 'Treatment Notes',
  immunization: 'Immunizations',
  allergy: 'Allergies',
  other: 'Other',
}

export function formatRecordCategory(category: RecordCategory): string {
  return CATEGORY_LABELS[category]
}

export function formatRecordStatus(status: MedicalRecordStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function formatRecordDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

