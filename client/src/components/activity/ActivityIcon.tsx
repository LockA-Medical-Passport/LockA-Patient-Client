import type { ActivityIconName } from './eventMeta'

export function ActivityIcon({ name, className = 'w-4 h-4' }: { name: ActivityIconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'aria-hidden': true,
  } as const

  switch (name) {
    case 'passport':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} />
          <circle cx="9" cy="10" r="2" strokeWidth={2} />
          <path strokeWidth={2} strokeLinecap="round" d="M5.5 17c.7-2 2-3 3.5-3s2.8 1 3.5 3M15 9h4M15 13h4" />
        </svg>
      )
    case 'request':
      return (
        <svg {...common}>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4" />
          <path strokeWidth={2} strokeLinecap="round" d="M5 19h14" />
        </svg>
      )
    case 'approved':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      )
    case 'denied':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path strokeWidth={2} strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
        </svg>
      )
    case 'revoked':
      return (
        <svg {...common}>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
          <path strokeWidth={2} strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
        </svg>
      )
    case 'record-added':
      return (
        <svg {...common}>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path strokeWidth={2} strokeLinecap="round" d="M12 11v6M9 14h6" />
        </svg>
      )
    case 'record-updated':
      return (
        <svg {...common}>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
        </svg>
      )
    case 'record-viewed':
      return (
        <svg {...common}>
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" strokeWidth={2} />
        </svg>
      )
    case 'device':
      return (
        <svg {...common}>
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" strokeWidth={2} />
          <path strokeWidth={2} strokeLinecap="round" d="M10 5h4M11 18.5h2" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path strokeWidth={2} strokeLinecap="round" d="M12 11v5M12 8h.01" />
        </svg>
      )
  }
}
