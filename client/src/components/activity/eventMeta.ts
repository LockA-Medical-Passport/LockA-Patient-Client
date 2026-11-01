import type { AuditEventKind } from '../../lib/soroban'
import type { BadgeColor } from '../ui'

export type ActivityIconName =
  | 'passport'
  | 'request'
  | 'approved'
  | 'denied'
  | 'revoked'
  | 'record-added'
  | 'record-updated'
  | 'record-viewed'
  | 'device'
  | 'other'

export interface ActivityEventMeta {
  label: string
  color: BadgeColor
  icon: ActivityIconName
}

/** One presentation entry per AuditEventKind, so no event renders as a mystery. */
export const ACTIVITY_EVENT_META: Record<AuditEventKind, ActivityEventMeta> = {
  'passport-registered': { label: 'Passport registered', color: 'cyan', icon: 'passport' },
  'access-requested': { label: 'Access requested', color: 'amber', icon: 'request' },
  'access-approved': { label: 'Access granted', color: 'green', icon: 'approved' },
  'access-denied': { label: 'Access denied', color: 'gray', icon: 'denied' },
  'access-revoked': { label: 'Access revoked', color: 'red', icon: 'revoked' },
  'record-anchored': { label: 'Record added', color: 'blue', icon: 'record-added' },
  'record-updated': { label: 'Record updated', color: 'amber', icon: 'record-updated' },
  'record-viewed': { label: 'Record viewed', color: 'cyan', icon: 'record-viewed' },
  'device-attested': { label: 'Device attested', color: 'blue', icon: 'device' },
  other: { label: 'Other activity', color: 'gray', icon: 'other' },
}

/** The colour classes for the icon tile, matched to the badge colour. */
export const ACTIVITY_TONE_CLASSES: Record<BadgeColor, string> = {
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  gray: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

export function activityEventMeta(kind: AuditEventKind): ActivityEventMeta {
  return ACTIVITY_EVENT_META[kind] ?? ACTIVITY_EVENT_META.other
}
