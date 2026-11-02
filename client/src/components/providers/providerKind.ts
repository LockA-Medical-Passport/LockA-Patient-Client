import type { ProviderKind } from '../../lib/soroban'

const KIND_LABELS: Record<ProviderKind, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  lab: 'Lab',
  pharmacy: 'Pharmacy',
  insurer: 'Insurer',
  other: 'Provider',
}

export function formatProviderKind(kind: ProviderKind): string {
  return KIND_LABELS[kind] ?? 'Provider'
}
