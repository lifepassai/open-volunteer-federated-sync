import { Card } from '@heroui/react'
import { IconPencil, IconTrash } from '../../components/icons'
import type { DatasetSource } from '../../net/serverApi'

function formatSyncTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export function DatasourceRow(props: {
  source: DatasetSource
  loading: boolean
  onEdit: (source: DatasetSource) => void
  onDelete: (source: DatasetSource) => void
}) {
  const { source: s, loading, onEdit, onDelete } = props

  return (
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
          <div className="truncate font-mono text-sm text-foreground/70">{s.uri}</div>
          <div className="mt-2 grid gap-1 text-xs text-foreground/60 sm:text-sm">
            <div>
              <span className="text-foreground/50">Last incremental sync: </span>
              <span className="text-foreground/80">{formatSyncTime(s.lastIncrementalSync)}</span>
            </div>
            <div>
              <span className="text-foreground/50">Last full sync: </span>
              <span className="text-foreground/80">{formatSyncTime(s.lastFullSync)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
      </Card.Content>
    </Card>
  )
}
