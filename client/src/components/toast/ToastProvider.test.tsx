import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function TestHarness() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Saved', { title: 'Success' })}>fire success</button>
      <button onClick={() => toast.error('Failed', { durationMs: 100_000 })}>fire error</button>
      <button onClick={() => toast.info('Heads up')}>fire info</button>
      <button onClick={() => toast.success('Quick', { durationMs: 30 })}>fire quick</button>
    </div>
  )
}

describe('ToastProvider / useToast', () => {
  it('shows a toast with its title and message', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByText('fire success'))
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('renders error toasts with role="alert" and others with role="status"', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByText('fire success'))
    await user.click(screen.getByText('fire error'))

    expect(screen.getByRole('alert')).toHaveTextContent('Failed')
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('stacks multiple toasts at once', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByText('fire success'))
    await user.click(screen.getByText('fire info'))
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Heads up')).toBeInTheDocument()
  })

  it('dismisses manually via the dismiss button', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    )
    await user.click(screen.getByText('fire error'))
    expect(screen.getByText('Failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(screen.queryByText('Failed')).not.toBeInTheDocument()
  })

  it('auto-dismisses after its configured duration', async () => {
    // Fake timers: on a busy machine the click alone can outlast a 30ms toast,
    // which used to make this race rather than test the dismissal.
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <TestHarness />
        </ToastProvider>,
      )
      // fireEvent, not userEvent: userEvent's own async waits do not mix with
      // fake timers here, and this test only needs one plain click.
      fireEvent.click(screen.getByText('fire quick'))
      expect(screen.getByText('Quick')).toBeInTheDocument()

      await act(() => vi.advanceTimersByTimeAsync(30))
      expect(screen.queryByText('Quick')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws a clear error when used outside a ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Broken() {
      useToast()
      return null
    }
    expect(() => render(<Broken />)).toThrow(/useToast must be used within a ToastProvider/)
    consoleError.mockRestore()
  })
})
