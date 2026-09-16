import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as QRCode from 'qrcode'
import { PassportQrCode } from './PassportQrCode'
import { decodePassportQrPayload, encodePassportQrPayload } from '../../lib/qr'

// Wraps the real implementation in a vi.fn() so most tests generate a genuine
// QR code, while the failure test below can still override its behaviour —
// `vi.spyOn` can't redefine a live ESM namespace export directly.
vi.mock('qrcode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('qrcode')>()
  return { ...actual, toDataURL: vi.fn(actual.toDataURL) }
})

describe('PassportQrCode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading state before the QR code resolves', () => {
    render(<PassportQrCode passportId="passport-7f3a91" />)
    expect(screen.getByRole('status', { name: /generating qr code/i })).toBeInTheDocument()
  })

  it('renders the QR code as an image once generated', async () => {
    render(<PassportQrCode passportId="passport-7f3a91" />)

    const img = await screen.findByRole('img', { name: /scannable qr code/i })
    expect(img).toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))
    expect(screen.queryByRole('status', { name: /generating qr code/i })).not.toBeInTheDocument()
  })

  it('shows the exact encoded payload with a copy-to-clipboard fallback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<PassportQrCode passportId="passport-7f3a91" />)
    await screen.findByRole('img', { name: /scannable qr code/i })

    const expectedPayload = encodePassportQrPayload('passport-7f3a91')
    expect(screen.getByTitle(expectedPayload)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /copy encoded value/i }))
    expect(writeText).toHaveBeenCalledWith(expectedPayload)
  })

  it('falls back to an error message if QR generation fails', async () => {
    vi.mocked(QRCode.toDataURL).mockRejectedValueOnce(new Error('boom'))

    render(<PassportQrCode passportId="passport-7f3a91" />)

    expect(await screen.findByText(/could not generate a qr code/i)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('regenerates when the passport id changes', async () => {
    const { rerender } = render(<PassportQrCode passportId="passport-7f3a91" />)
    await screen.findByRole('img', { name: /scannable qr code/i })

    rerender(<PassportQrCode passportId="passport-other" />)

    await waitFor(() => expect(screen.getByTitle(encodePassportQrPayload('passport-other'))).toBeInTheDocument())
  })
})

describe('PassportQrCode — encoded payload format', () => {
  it('encodes exactly the passport identifier, decodable back to it', () => {
    const payload = encodePassportQrPayload('passport-7f3a91')
    expect(decodePassportQrPayload(payload)).toBe('passport-7f3a91')
  })
})
