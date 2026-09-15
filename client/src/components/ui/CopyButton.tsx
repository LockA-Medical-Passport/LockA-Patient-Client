import { useEffect, useRef, useState } from 'react'

export interface CopyButtonProps {
  /** The text copied to the clipboard when clicked. */
  value: string
  /** Accessible label for the idle state. Defaults to a generic "Copy". */
  label?: string
  className?: string
}

const RESET_DELAY_MS = 1500

/** Icon-only copy-to-clipboard button. Falls back silently if the Clipboard API is unavailable. */
export function CopyButton({ value, label = 'Copy to clipboard', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), RESET_DELAY_MS)
    } catch {
      // Clipboard API unavailable (unsupported browser, insecure context, denied
      // permission) — nothing to fall back to from a click handler, so stay quiet.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={`text-slate-600 hover:text-brand-cyan transition-colors flex-shrink-0 ${className}`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  )
}
