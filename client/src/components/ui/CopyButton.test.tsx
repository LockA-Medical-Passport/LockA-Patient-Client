import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyButton } from './CopyButton'

// `userEvent.setup()` installs its own clipboard stub, so the fake must be
// defined *after* setup or it gets overwritten.
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
}

describe('CopyButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies the value to the clipboard when clicked', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    render(<CopyButton value="passport-7f3a91" />)
    await user.click(screen.getByRole('button', { name: /copy to clipboard/i }))

    expect(writeText).toHaveBeenCalledWith('passport-7f3a91')
  })

  it('shows a brief confirmation after a successful copy, then reverts', async () => {
    const user = userEvent.setup()
    stubClipboard(vi.fn().mockResolvedValue(undefined))

    render(<CopyButton value="passport-7f3a91" />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument(), {
      timeout: 3000,
    })
  }, 10000)

  it('fails silently when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))

    render(<CopyButton value="passport-7f3a91" />)
    await user.click(screen.getByRole('button', { name: /copy to clipboard/i }))

    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument()
  })
})
