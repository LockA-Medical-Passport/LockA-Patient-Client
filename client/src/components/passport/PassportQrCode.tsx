import { useEffect, useState } from 'react'
import * as QRCode from 'qrcode'
import { encodePassportQrPayload } from '../../lib/qr'
import { Card, CopyButton, Spinner } from '../ui'

export interface PassportQrCodeProps {
  passportId: string
}

const QR_SIZE = 220

const QR_OPTIONS = {
  width: QR_SIZE,
  margin: 1,
  errorCorrectionLevel: 'M',
} as const

interface QrState {
  dataUrl: string | null
  error: string | null
}

/** A scannable QR code a provider scans to start an access request — see lib/qr for the payload format. */
export function PassportQrCode({ passportId }: PassportQrCodeProps) {
  const payload = encodePassportQrPayload(passportId)
  const [state, setState] = useState<QrState>({ dataUrl: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ dataUrl: null, error: null })

    QRCode.toDataURL(payload, QR_OPTIONS).then(
      (dataUrl) => {
        if (!cancelled) {
          setState({ dataUrl, error: null })
        }
      },
      () => {
        if (!cancelled) {
          setState({ dataUrl: null, error: 'Could not generate a QR code.' })
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [payload])

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-white mb-2">Share via QR code</h2>
      <p className="text-slate-400 text-sm mb-6">
        A provider scans this to start an access request for your passport.
      </p>

      <div className="flex flex-col items-center gap-4">
        {state.dataUrl && (
          <img
            src={state.dataUrl}
            alt="Scannable QR code for your passport"
            width={QR_SIZE}
            height={QR_SIZE}
            className="rounded-lg bg-white p-3"
          />
        )}
        {!state.dataUrl && state.error && <p className="text-sm text-red-400">{state.error}</p>}
        {!state.dataUrl && !state.error && (
          <div
            role="status"
            aria-label="Generating QR code"
            style={{ width: QR_SIZE, height: QR_SIZE }}
            className="flex items-center justify-center"
          >
            <Spinner size={28} />
          </div>
        )}

        <div className="flex items-center gap-2 w-full min-w-0">
          <span className="font-mono text-[11px] text-slate-500 truncate flex-1" title={payload}>
            {payload}
          </span>
          <CopyButton value={payload} label="Copy encoded value" />
        </div>
      </div>
    </Card>
  )
}
