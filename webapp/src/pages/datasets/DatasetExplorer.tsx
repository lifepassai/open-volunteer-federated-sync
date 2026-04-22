import { Button, Card } from '@heroui/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'

const PAGE_SIZE = 10

function columnOrder(keys: string[]) {
  const preferred = ['uri', 'name', 'location', 'created', 'updated']
  const pref = preferred.filter((k) => keys.includes(k))
  const rest = keys.filter((k) => !preferred.includes(k)).sort()
  return [...pref, ...rest]
}

export type DatasetExplorerHandle = {
  reload: () => void
}

export type DatasetExplorerProps = {
  title?: string
  description?: string
  /** When true, omit outer Card and title block (for use inside CollapsibleCard). */
  embedded?: boolean
  fetchRows: () => Promise<Record<string, unknown>[]>
  /** Notified when a load starts / finishes (e.g. for CollapsibleCard `refreshing`). */
  onLoadingChange?: (loading: boolean) => void
}

export const DatasetExplorer = forwardRef<DatasetExplorerHandle, DatasetExplorerProps>(function DatasetExplorer(
  props,
  ref,
) {
  const {
    title = 'Dataset',
    description = 'Browse rows returned by the dataset list API.',
    embedded = false,
    fetchRows,
    onLoadingChange,
  } = props

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    onLoadingChange?.(true)
    setError(null)
    try {
      const list = await fetchRows()
      setRows(Array.isArray(list) ? list : [])
      setPageIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dataset')
      setRows([])
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }, [fetchRows, onLoadingChange])

  useImperativeHandle(
    ref,
    () => ({
      reload: () => {
        void load()
      },
    }),
    [load],
  )

  useEffect(() => {
    void load()
  }, [load])

  const totalRows = rows.length
  const pageCount = totalRows === 0 ? 0 : Math.ceil(totalRows / PAGE_SIZE)

  useEffect(() => {
    if (pageCount === 0) {
      setPageIndex(0)
      return
    }
    setPageIndex((prev) => Math.min(prev, pageCount - 1))
  }, [pageCount, totalRows])

  const safePage = pageCount === 0 ? 0 : Math.min(pageIndex, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalRows)
  const pageRows = rows.slice(pageStart, pageEnd)

  const columns = useMemo(() => {
    const keys = new Set<string>()
    for (const r of rows) Object.keys(r).forEach((k) => keys.add(k))
    return columnOrder(Array.from(keys))
  }, [rows])

  const displayValue = (v: unknown) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  const header = embedded ? (
    <p className="text-sm">
      <span className="text-foreground/60">Total rows: </span>
      <span className="font-medium">{loading ? '…' : totalRows}</span>
    </p>
  ) : (
    <div className="min-w-0">
      <h3 className="truncate">{title}</h3>
      <p className="text-sm text-foreground/70">{description}</p>
      <p className="mt-2 text-sm">
        <span className="text-foreground/60">Total rows: </span>
        <span className="font-medium">{loading ? '…' : totalRows}</span>
      </p>
    </div>
  )

  const body = (
    <>
      {error ? (
        <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="text-sm text-foreground/60">Loading…</div>
      ) : totalRows === 0 && !loading ? (
        <div className="text-sm text-foreground/60">No rows in this dataset.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-default-200">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-default-200 bg-default-100/80">
                  {columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-foreground/80">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={pageStart + i} className="border-b border-default-100 last:border-b-0">
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
              {totalRows === 0 ? (
                '—'
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{pageStart + 1}</span>–
                  <span className="font-medium text-foreground">{pageEnd}</span> of{' '}
                  <span className="font-medium text-foreground">{totalRows}</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onPress={() => setPageIndex((p) => Math.max(0, p - 1))}
                isDisabled={loading || pageCount === 0 || safePage <= 0}
              >
                Previous
              </Button>
              <span className="text-sm text-foreground/70">
                {pageCount === 0 ? '—' : `Page ${safePage + 1} of ${pageCount}`}
              </span>
              <Button
                variant="secondary"
                onPress={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                isDisabled={loading || pageCount === 0 || safePage >= pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-4">
        {header}
        {body}
      </div>
    )
  }

  return (
    <Card>
      <Card.Content className="space-y-4 p-4">
        {header}
        {body}
      </Card.Content>
    </Card>
  )
})
