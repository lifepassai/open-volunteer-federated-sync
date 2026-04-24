import { Button, Card } from '@heroui/react'
import { useState } from 'react'
import { IconPencil, IconTrash } from '../../../components/icons'
import { triggerUpdateSyncStream, type DatasetSource } from '../../../net/serverApi'
import type { SseEvent } from '../../../net/sse'
import { FullSyncModal } from '../sync/FullSyncModal'
import { UpdateSyncModal } from '../sync/UpdateSyncModal'

function formatSyncTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

type SyncMode = 'updates' | 'full'

/** Log SSE payload: show `message` as plain text; JSON only for remaining fields (avoids quoting human text). */
function formatSyncSsePayload(data: unknown): string {
  return typeof data === "string" ? data : JSON.stringify(data, null, 2)
}

export function DatasourceRow(props: {
  source: DatasetSource
  loading: boolean
  onEdit: (source: DatasetSource) => void
  onDelete: (source: DatasetSource) => void
}) {
  const { source: s, loading, onEdit, onDelete } = props
  const [syncMode, setSyncMode] = useState<SyncMode | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [logText, setLogText] = useState<string>('')

  const modalOpen = syncMode !== null
  const anyLoading = loading || syncLoading

  async function startSync() {
    setSyncLoading(true)
    setLogText('')

    if (syncMode === 'full') {
      setLogText(
        'Full snapshot sync from the datasource is not wired in the web UI yet.\nUse incremental “Sync updates” or the sync API directly.',
      )
      setSyncLoading(false)
      return
    }

    const path = `/api/sync/triggers/update/${encodeURIComponent(s.id)}`
    setLogText((prev) => `${prev}${prev ? '\n\n' : ''}GET ${path}\nAccept: text/event-stream`)

    try {
      await triggerUpdateSyncStream({
        datasourceId: s.id,
        onEvent: ({ event, data }: SseEvent) => {
          setLogText((prev) => `${prev}\n\nevent: ${event}\ndata: ${formatSyncSsePayload(data)}`)
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLogText((prev) => `${prev}\n\nERROR\n${msg}`)
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <>
      <Card>
        <Card.Content className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-sm font-medium">{s.name ?? '—'}</div>
            {s.disabled ? (
              <span className="shrink-0 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:border-warning-900/50 dark:bg-warning-950/40 dark:text-warning-300">
                Disabled
              </span>
            ) : null}
          </div>
          <div className="truncate font-mono text-sm text-foreground/70">{s.baseUrl ?? '—'}</div>
          <div className="mt-2 grid gap-1 text-xs text-foreground/60 sm:text-sm">
            <div>
              <span className="text-foreground/50">Last update sync: </span>
              <span className="text-foreground/80">{formatSyncTime(s.lastUpdateSync)}</span>
            </div>
            <div>
              <span className="text-foreground/50">Last snapshot sync: </span>
              <span className="text-foreground/80">{formatSyncTime(s.lastSnapshotSync)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(s)}
              disabled={loading}
              aria-label="Edit datasource"
              title="Edit"
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
            >
              <IconPencil className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(s)}
              disabled={loading}
              aria-label="Delete datasource"
              title="Delete"
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
            >
              <IconTrash className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setSyncMode('updates')}
              isDisabled={anyLoading}
            >
              Sync Updates
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setSyncMode('full')}
              isDisabled={anyLoading}
            >
              Full Sync
            </Button>
          </div>
        </div>
        </Card.Content>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!anyLoading) setSyncMode(null)
            }}
            aria-hidden="true"
          />
          {syncMode === 'updates' ? (
            <UpdateSyncModal
              onClose={() => setSyncMode(null)}
              onStart={startSync}
              onClear={() => setLogText('')}
              loading={anyLoading}
              logText={logText}
            />
          ) : (
            <FullSyncModal
              onClose={() => setSyncMode(null)}
              onStart={startSync}
              loading={anyLoading}
              logText={logText}
            />
          )}
        </div>
      ) : null}
    </>
  )
}
