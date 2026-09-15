import { Button, Card, Spinner } from '../ui'

/** Shown while the passport lookup is in flight. */
export function PassportLoading({ label }: { label: string }) {
  return (
    <Card className="p-10 flex flex-col items-center gap-3 text-center">
      <Spinner size={24} />
      <p className="text-sm text-slate-400">{label}</p>
    </Card>
  )
}

/** Shown when the passport lookup itself failed — the wallet's state is unknown. */
export function PassportLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-10 text-center">
      <h1 className="text-lg font-bold text-white mb-2">Could not reach the passport registry</h1>
      <p className="text-sm text-slate-400 mb-6">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  )
}
