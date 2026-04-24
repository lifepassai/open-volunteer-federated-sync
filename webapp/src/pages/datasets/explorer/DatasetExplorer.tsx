import { Button } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CollapsibleCard } from '../../../components/CollapsibleCard'

const PAGE_SIZE = 10

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
  fetchRows: () => Promise<Record<string, unknown>[]>
}

export function DatasetExplorer(props: DatasetExplorerProps) {
  const {
    title = 'Dataset',
    description = 'Browse rows returned by the dataset list API.',
    defaultCollapsed = true,
    fetchRows,
  } = props

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
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
    }
  }, [fetchRows])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const totalRows = rows.length
  const pageCount = totalRows === 0 ? 0 : Math.ceil(totalRows / PAGE_SIZE)

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (pageCount === 0) {
        setPageIndex(0)
        return
      }
      setPageIndex((prev) => Math.min(prev, pageCount - 1))
    }, 0)
    return () => window.clearTimeout(t)
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

  const header = (
    <p className="text-sm">
      <span className="text-foreground/60">Total rows: </span>
      <span className="font-medium">{loading ? '…' : totalRows}</span>
    </p>
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

  return (
    <CollapsibleCard
      title={title}
      description={description}
      defaultCollapsed={defaultCollapsed}
      refreshing={loading}
      onRefresh={() => void load()}
    >
      <div className="space-y-4">
        {header}
        {body}
      </div>
    </CollapsibleCard>
  )
}
