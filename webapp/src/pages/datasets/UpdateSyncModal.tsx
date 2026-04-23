import { Button } from '@heroui/react'

export function UpdateSyncModal(props: {
  onClose: () => void
  onStart?: () => void
  loading?: boolean
  logText?: string
}) {
  const { onClose, onStart, loading, logText } = props

  return (
    <div className="relative w-full max-w-xl rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate">Sync updates</h3>
          <p className="text-sm text-foreground/70">
            Fetch incremental changes since your last sync.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
          onClick={() => {
            if (!loading) onClose()
          }}
        >
          ✕
        </button>
      </div>

      {logText ? (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-foreground/80">Log</div>
          <pre className="max-h-80 overflow-auto rounded-md border border-default-200 bg-default-50 p-3 text-xs text-foreground/80 dark:border-default-800 dark:bg-default-900/40">
            {logText}
          </pre>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="secondary" onPress={onClose} isDisabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onPress={onStart} isDisabled={loading}>
          Start
        </Button>
      </div>
    </div>
  )
}
