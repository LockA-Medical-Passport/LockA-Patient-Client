export interface NavIconProps {
  className?: string
}

export function DashboardIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2} />
    </svg>
  )
}

export function PassportIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
      <circle cx="9" cy="10" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M5.5 17c.7-2 2-3 3.5-3s2.8 1 3.5 3" />
      <path strokeLinecap="round" strokeWidth={2} d="M15 9h4M15 13h4" />
    </svg>
  )
}

export function RecordsIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
      />
      <path strokeLinecap="round" strokeWidth={2} d="M9 12h6M9 16h6M9 8h3" />
    </svg>
  )
}

export function ConsentIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function ActivityIcon({ className }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l2.5-6 5 12 2.5-6h4" />
    </svg>
  )
}
