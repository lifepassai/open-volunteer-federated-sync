import { Avatar, Button, Card } from '@heroui/react'
import { useMemo, useState } from 'react'
import { CollapsibleCard } from '../../../components/CollapsibleCard'
import { IconPencil, IconTrash } from '../../../components/icons'
import {
  createDatasetSubscriber,
  deleteDatasetSubscriber,
  listDatasetSubscribers,
  listAccounts,
  updateDatasetSubscriber,
  type DatasetSubscriber,
  type DatasetType,
  type AccountRow,
} from '../../../net/serverApi'
import { useAccountStore, type AccountState } from '../../../stores/accountStore'

export function DatasetSubscriberList(props: { type: DatasetType }) {
  const { type } = props

  const [loadedOnce, setLoadedOnce] = useState(false)

  const [subscribers, setSubscribers] = useState<DatasetSubscriber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetSubscriber | null>(null)
  const [deleting, setDeleting] = useState<DatasetSubscriber | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formDisabled, setFormDisabled] = useState(false)

  const [accounts, setAccounts] = useState<AccountRow[]>([])

  const account = useAccountStore((s: AccountState) => s.account)

  const sorted = useMemo(() => {
    return [...subscribers].sort((a, b) => a.created.localeCompare(b.created))
  }, [subscribers])

  const accountsByUid = useMemo(() => {
    return new Map(accounts.map((a) => [a.uid, a]))
  }, [accounts])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [subsResult, accountsResult] = await Promise.allSettled([
        listDatasetSubscribers({ type }),
        listAccounts(),
      ])

      if (subsResult.status === 'fulfilled') {
        setSubscribers(subsResult.value)
      } else {
        throw subsResult.reason
      }

      if (accountsResult.status === 'fulfilled') {
        setAccounts(accountsResult.value)
      }

      setLoadedOnce(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }

  const onOpenChange = (next: boolean) => {
    if (next && !loadedOnce) void refresh()
  }

  const openEdit = (s: DatasetSubscriber) => {
    setEditing(s)
    setFormName(s.name ?? '')
    setFormDescription(s.description ?? '')
    setFormApiKey(s.apiKey ?? '')
    setFormDisabled(Boolean(s.disabled))
    setIsModalOpen(true)
  }

  const onSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (editing) {
        await updateDatasetSubscriber({
          type,
          name: formName || undefined,
          description: formDescription || undefined,
          apiKey: formApiKey || undefined,
          disabled: formDisabled || undefined,
        })
      } else {
        await createDatasetSubscriber({
          type,
          name: formName || undefined,
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

  const openDelete = (s: DatasetSubscriber) => {
    setDeleting(s)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setLoading(true)
    setError(null)
    try {
      await deleteDatasetSubscriber({ type: deleting.type })
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
        title="Subscribers"
        description="Manage who can subscribe to this dataset."
        defaultCollapsed
        refreshing={loading}
        onRefresh={() => void refresh()}
        onOpenChange={onOpenChange}
      >
        {error ? (
          <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {loading && sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">Loading…</div>
          ) : !loadedOnce ? (
            <div className="text-sm text-foreground/60">Not loaded.</div>
          ) : sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">No subscribers yet.</div>
          ) : (
            sorted.map((s) => (
              <Card key={`${s.uid}:${s.type}`}>
                <Card.Content className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    {(() => {
                      const a = accountsByUid.get(s.uid)
                      const label = a?.email ?? s.uid
                      return (
                        <div className="mt-2 flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {a?.pictureUrl ? <Avatar.Image src={a.pictureUrl} alt="" /> : null}
                            <Avatar.Fallback>{label.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="truncate text-sm font-medium">{a?.name ?? s.name ?? '—'}</div>
                              {s.disabled ? (
                                <span className="shrink-0 rounded-full border border-warning-200 bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:border-warning-900/50 dark:bg-warning-950/40 dark:text-warning-300">
                                  Disabled
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-sm text-foreground/70">{a?.email ?? '—'}</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {account?.uid === s.uid ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          disabled={loading}
                          aria-label="Edit subscriber"
                          title="Edit"
                          className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
                        >
                          <IconPencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(s)}
                          disabled={loading}
                          aria-label="Delete subscriber"
                          title="Delete"
                          className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
                        >
                          <IconTrash className="h-5 w-5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </Card.Content>
              </Card>
            ))
          )}
        </div>

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
                  <h3 className="truncate">Delete subscription</h3>
                  <p className="text-sm text-foreground/70">
                    This will remove subscriber <span className="font-mono">{deleting.uid}</span> for type{' '}
                    <span className="font-mono">{deleting.type}</span>.
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
                  <h3 className="truncate">{editing ? 'Edit subscription' : 'Subscribe'}</h3>
                  <p className="text-sm text-foreground/70">
                    This creates a dataset subscriber record for type <span className="font-mono">{type}</span>.
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
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 dark:border-slate-800 dark:bg-slate-950"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Optional label for this subscriber"
                    disabled={loading}
                  />
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
                    <div className="text-foreground/60">Disable access without deleting the record.</div>
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
      </CollapsibleCard>
    </div>
  )
}

