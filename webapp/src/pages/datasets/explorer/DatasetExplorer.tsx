import { Button } from '@heroui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CollapsibleCard } from '../../../components/CollapsibleCard'
import { IconPencil, IconPlus, IconTrash } from '../../../components/icons'

function columnOrder(keys: string[]) {
  const preferred = ['uri', 'name', 'location', 'created', 'updated']
  const pref = preferred.filter((k) => keys.includes(k))
  const rest = keys.filter((k) => !preferred.includes(k)).sort()
  return [...pref, ...rest]
}

export type DatasetExplorerProps = {
  title?: string
  description?: string
  defaultCollapsed?: boolean
  fetchPage: (cursor?: string) => Promise<{ records: Record<string, unknown>[]; cursor?: string }>
  isAdmin?: boolean
  createRecord?: (record: Record<string, unknown>) => Promise<unknown>
  updateRecord?: (record: Record<string, unknown>) => Promise<unknown>
  deleteRecord?: (uri: string) => Promise<unknown>
}

export function DatasetExplorer(props: DatasetExplorerProps) {
  const {
    title = 'Dataset',
    description = 'Browse rows returned by the dataset list API.',
    defaultCollapsed = true,
    fetchPage,
    isAdmin = false,
    createRecord,
    updateRecord,
    deleteRecord,
  } = props

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [, setCursorByPage] = useState<(string | undefined)[]>([undefined])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const cursorByPageRef = useRef<(string | undefined)[]>([undefined])
  const [editUri, setEditUri] = useState<string | null>(null)
  const [deleteUri, setDeleteUri] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [formUri, setFormUri] = useState('')
  const [formName, setFormName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPage = useCallback(async (targetPageIndex: number, opts?: { reset?: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      const baseCursors = opts?.reset ? [undefined] : cursorByPageRef.current
      const cursor = baseCursors[targetPageIndex]
      const res = await fetchPage(cursor)
      const records = Array.isArray(res?.records) ? res.records : []

      setRows(records)
      setPageIndex(targetPageIndex)
      setNextCursor(typeof res?.cursor === 'string' && res.cursor.length > 0 ? res.cursor : undefined)

      setCursorByPage(() => {
        const next = baseCursors.slice(0, targetPageIndex + 1)
        if (typeof res?.cursor === 'string' && res.cursor.length > 0) next[targetPageIndex + 1] = res.cursor
        cursorByPageRef.current = next
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dataset')
      setRows([])
      setNextCursor(undefined)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadPage(0, { reset: true })
    }, 0)
    return () => window.clearTimeout(t)
  }, [loadPage])

  const columns = useMemo(() => {
    const keys = new Set<string>()
    for (const r of rows) Object.keys(r).forEach((k) => keys.add(k))
    return columnOrder(Array.from(keys))
  }, [rows])

  const canEdit = isAdmin && typeof updateRecord === 'function'
  const canDelete = isAdmin && typeof deleteRecord === 'function'
  const canCreate = isAdmin && typeof createRecord === 'function'
  const showActions = canEdit || canDelete

  const closeAllModals = () => {
    if (saving) return
    setEditUri(null)
    setDeleteUri(null)
    setCreateOpen(false)
  }

  const openCreate = () => {
    setError(null)
    setFormUri('')
    setFormName('')
    setFormLocation('')
    setCreateOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    const uri = typeof row.uri === 'string' ? row.uri : ''
    if (!uri) return
    setError(null)
    setEditUri(uri)
    setFormUri(uri)
    setFormName(typeof row.name === 'string' ? row.name : '')
    setFormLocation(typeof row.location === 'string' ? row.location : '')
  }

  const openDelete = (row: Record<string, unknown>) => {
    const uri = typeof row.uri === 'string' ? row.uri : ''
    if (!uri) return
    setError(null)
    setDeleteUri(uri)
  }

  const submitCreate = async () => {
    if (!createRecord) return
    const uri = formUri.trim()
    if (!uri) {
      setError('URI is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createRecord({
        uri,
        name: formName.trim() || undefined,
        location: formLocation.trim() || undefined,
      })
      setCreateOpen(false)
      await loadPage(0, { reset: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create record')
    } finally {
      setSaving(false)
    }
  }

  const submitUpdate = async () => {
    if (!updateRecord) return
    const uri = formUri.trim()
    if (!uri) {
      setError('URI is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateRecord({
        uri,
        name: formName.trim() || undefined,
        location: formLocation.trim() || undefined,
      })
      setEditUri(null)
      await loadPage(0, { reset: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteRecord || !deleteUri) return
    setSaving(true)
    setError(null)
    try {
      await deleteRecord(deleteUri)
      setDeleteUri(null)
      await loadPage(0, { reset: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete record')
    } finally {
      setSaving(false)
    }
  }

  const displayValue = (v: unknown) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  const header = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm">
        <span className="text-foreground/60">Rows in page: </span>
        <span className="font-medium">{loading ? '…' : rows.length}</span>
      </p>
      {canCreate ? (
        <button
          type="button"
          onClick={openCreate}
          disabled={loading || saving}
          aria-label="Add record"
          title="Add record"
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
        >
          <IconPlus className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  )

  const body = (
    <>
      {error ? (
        <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-foreground/60">Loading…</div>
      ) : rows.length === 0 && !loading ? (
        <div className="text-sm text-foreground/60">No rows in this dataset.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-default-200">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-default-200 bg-default-100/80">
                  {showActions ? <th className="w-0 whitespace-nowrap px-3 py-2" /> : null}
                  {columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-foreground/80">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-default-100 last:border-b-0">
                    {showActions ? (
                      <td className="whitespace-nowrap px-2 py-2">
                        <div className="flex items-center gap-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              disabled={loading || saving}
                              aria-label={`Edit ${typeof row.uri === 'string' ? row.uri : 'record'}`}
                              title="Edit"
                              className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
                            >
                              <IconPencil className="h-5 w-5" />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => openDelete(row)}
                              disabled={loading || saving}
                              aria-label={`Delete ${typeof row.uri === 'string' ? row.uri : 'record'}`}
                              title="Delete"
                              className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
                            >
                              <IconTrash className="h-5 w-5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col} className="max-w-[20rem] truncate px-3 py-2 font-mono text-xs text-foreground/90">
                        {displayValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-foreground/70">
              Page <span className="font-medium text-foreground">{pageIndex + 1}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onPress={() => void loadPage(Math.max(0, pageIndex - 1))}
                isDisabled={loading || pageIndex <= 0}
              >
                Previous
              </Button>
              <span className="text-sm text-foreground/70">
                {nextCursor ? 'More pages available' : 'End of results'}
              </span>
              <Button
                variant="secondary"
                onPress={() => void loadPage(pageIndex + 1)}
                isDisabled={loading || !nextCursor}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )

  return (
    <CollapsibleCard
      title={title}
      description={description}
      defaultCollapsed={defaultCollapsed}
      refreshing={loading}
      onRefresh={() => void loadPage(0, { reset: true })}
    >
      <div className="space-y-4">
        {header}
        {body}
      </div>

      {deleteUri ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => closeAllModals()}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Delete record</h3>
                <p className="text-sm text-foreground/70">
                  This will permanently delete <span className="font-mono">{deleteUri}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => closeAllModals()}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setDeleteUri(null)} isDisabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onPress={confirmDelete} isDisabled={saving}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editUri ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => closeAllModals()} aria-hidden="true" />
          <div className="relative w-full max-w-xl rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Edit record</h3>
                <p className="text-sm text-foreground/70">
                  Update fields for <span className="font-mono">{editUri}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => closeAllModals()}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">URI</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formUri}
                  disabled
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Name</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Location</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setEditUri(null)} isDisabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onPress={submitUpdate} isDisabled={saving}>
                Update
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => closeAllModals()} aria-hidden="true" />
          <div className="relative w-full max-w-xl rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Add record</h3>
                <p className="text-sm text-foreground/70">Create a new record in this dataset.</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => closeAllModals()}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">URI</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formUri}
                  onChange={(e) => setFormUri(e.target.value)}
                  placeholder="https://example.com/volunteer/123"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Name</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Location</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setCreateOpen(false)} isDisabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onPress={submitCreate} isDisabled={saving}>
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </CollapsibleCard>
  )
}
