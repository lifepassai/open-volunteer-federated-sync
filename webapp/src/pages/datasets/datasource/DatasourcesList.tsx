import { Button } from '@heroui/react'
import { useMemo, useState } from 'react'
import { CollapsibleCard } from '../../../components/CollapsibleCard'
import { IconPlus } from '../../../components/icons'
import { DatasourceRow } from './DatasourceRow'
import { useSettingsStore } from '../../../stores/settingsStore'
import {
  createDatasetSource,
  deleteDatasetSource,
  listDatasetSources,
  updateDatasetSource,
  type DatasetSource,
  type DatasetType,
} from '../../../net/serverApi'

export function DatasourcesList(props: { type: DatasetType }) {
  const { type } = props

  const isExpert = useSettingsStore((s: { expertMode: boolean }) => s.expertMode)

  const [loadedOnce, setLoadedOnce] = useState(false)
  const [sources, setSources] = useState<DatasetSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetSource | null>(null)
  const [deleting, setDeleting] = useState<DatasetSource | null>(null)

  const [formName, setFormName] = useState('')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formDisabled, setFormDisabled] = useState(false)

  const sorted = useMemo(() => {
    return [...sources].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [sources])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listDatasetSources({ type })
      setSources(list)
      setLoadedOnce(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load datasources')
    } finally {
      setLoading(false)
    }
  }

  const onOpenChange = (next: boolean) => {
    if (next && !loadedOnce) void refresh()
  }

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormBaseUrl('')
    setFormDescription('')
    setFormApiKey('')
    setFormDisabled(false)
    setIsModalOpen(true)
  }

  const openEdit = (s: DatasetSource) => {
    setEditing(s)
    setFormName(s.name ?? '')
    setFormBaseUrl(s.baseUrl ?? '')
    setFormDescription(s.description ?? '')
    setFormApiKey(s.apiKey ?? '')
    setFormDisabled(Boolean(s.disabled))
    setIsModalOpen(true)
  }

  const onSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const name = formName.trim()
      const baseUrl = formBaseUrl.trim()
      if (!name) throw new Error('Name is required')

      if (editing) {
        await updateDatasetSource({
          id: editing.id,
          name,
          baseUrl: baseUrl || undefined,
          description: formDescription || undefined,
          apiKey: formApiKey || undefined,
          disabled: formDisabled || undefined,
        })
      } else {
        await createDatasetSource({
          type,
          name,
          baseUrl: baseUrl || undefined,
          description: formDescription || undefined,
          apiKey: formApiKey || undefined,
          disabled: formDisabled || undefined,
        })
      }
      setIsModalOpen(false)
      setEditing(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  const openDelete = (s: DatasetSource) => {
    setDeleting(s)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setLoading(true)
    setError(null)
    try {
      await deleteDatasetSource({ id: deleting.id })
      setDeleting(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Datasources"
        description={`Manage dataset sources for type ${type}.`}
        defaultCollapsed
        refreshing={loading}
        onRefresh={() => void refresh()}
        onOpenChange={onOpenChange}
        headerActions={
          <button
            type="button"
            onClick={openCreate}
            disabled={loading}
            aria-label="Add datasource"
            title="Add datasource"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
          >
            <IconPlus className="h-6 w-6" />
          </button>
        }
      >
        {error ? (
          <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
        ) : null}

        <div className="space-y-3">
          {loading && sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">Loading…</div>
          ) : !loadedOnce ? (
            <div className="text-sm text-foreground/60">Not loaded.</div>
          ) : sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">No datasources yet.</div>
          ) : (
            sorted.map((s) => (
              <DatasourceRow
                key={s.id}
                source={s}
                loading={loading}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))
          )}
        </div>
      </CollapsibleCard>

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setDeleting(null)
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Delete datasource</h3>
                <p className="text-sm text-foreground/70">
                  This will permanently delete <span className="font-mono">{deleting.name}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => {
                  if (!loading) setDeleting(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setDeleting(null)} isDisabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" onPress={confirmDelete} isDisabled={loading}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setIsModalOpen(false)
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xl rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">{editing ? 'Edit datasource' : 'Add datasource'}</h3>
                <p className="text-sm text-foreground/70">
                  This creates a datasource record for type <span className="font-mono">{type}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => {
                  if (!loading) setIsModalOpen(false)
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Name</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="my-datasource"
                  disabled={loading}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Base URL (optional)</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={loading}
                />
                {isExpert && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {[
                      'http://localhost:3001/examples/doit/volunteer',
                      'http://localhost:3001/examples/team-kinetic/volunteer',
                      'https://example.com/api/datasets/volunteers',
                    ].map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setFormBaseUrl(url)}
                        disabled={loading}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-foreground/80 hover:bg-default-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
                        title="Set Base URL"
                      >
                        {url}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">Description</div>
                <textarea
                  className="min-h-[88px] w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes"
                  disabled={loading}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm text-foreground/70">API key</div>
                <input
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="Optional"
                  disabled={loading}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div>Disabled</div>
                  <div className="text-foreground/60">Disable this source without deleting it.</div>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formDisabled}
                  onChange={(e) => setFormDisabled(e.target.checked)}
                  disabled={loading}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setIsModalOpen(false)} isDisabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" onPress={onSubmit} isDisabled={loading}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
