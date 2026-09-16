import type { ReactNode } from 'react'
import { Card } from './Card'

export interface StatCardProps {
  label: string
  value: ReactNode
  /** Small caption under the value — e.g. a unit or extra context. */
  sub?: ReactNode
  /** Decorative icon shown next to the label. */
  icon?: ReactNode
}

/** A single summary metric on the dashboard, e.g. "Pending Consent — 2". */
export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        {icon && (
          <div className="text-brand-cyan" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1 truncate">{sub}</div>}
    </Card>
  )
}
