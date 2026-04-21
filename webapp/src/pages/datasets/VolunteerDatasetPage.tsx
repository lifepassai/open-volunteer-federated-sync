import { Button, Card } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { GoogleLoginButton } from '../../components/GoogleLoginButton'
import { useAccountStore } from '../../stores/accountStore'
import {
  createDatasetSubscriber,
  deleteDatasetSubscriber,
  listDatasetSubscribers,
  updateDatasetSubscriber,
  type DatasetSubscriber,
} from '../../net/serverApi'

export function VolunteerDatasetPage() {
  const { account } = useAccountStore();
  const [subscribers, setSubscribers] = useState<DatasetSubscriber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetSubscriber | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formDisabled, setFormDisabled] = useState(false)

  const canManage = Boolean(account)

  const sorted = useMemo(() => {
    return [...subscribers].sort((a, b) => a.created.localeCompare(b.created))
  }, [subscribers])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listDatasetSubscribers({ type: 'volunteer' })
      setSubscribers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManage) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setFormApiKey('')
    setFormDisabled(false)
    setIsModalOpen(true)
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
          type: 'volunteer',
          name: formName || undefined,
          description: formDescription || undefined,
          apiKey: formApiKey || undefined,
          disabled: formDisabled || undefined,
        })
      } else {
        await createDatasetSubscriber({
          type: 'volunteer',
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

  const onDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteDatasetSubscriber({ type: 'volunteer' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Content className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3>Subscribers</h3>
            <p className="text-sm text-foreground/70">
              Manage who can subscribe to the volunteer dataset.
            </p>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onPress={refresh} isDisabled={loading}>
                Refresh
              </Button>
              <Button variant="primary" onPress={openCreate} isDisabled={loading}>
                Subscribe
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-sm text-foreground/70">Sign in to subscribe.</div>
              <GoogleLoginButton />
            </div>
          )}
        </Card.Content>
      </Card>

      {error ? <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div> : null}

      {canManage ? (
        <div className="space-y-3">
          {loading && sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="text-sm text-foreground/60">No volunteer dataset subscribers yet.</div>
          ) : (
            sorted.map((s) => (
              <Card key={`${s.uid}:${s.type}`}>
                <Card.Content className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground/60">Account</div>
                    <div className="truncate">{s.uid}</div>
                    <div className="mt-2 grid gap-1 text-sm">
                      <div>
                        <span className="text-foreground/60">Name: </span>
                        <span>{s.name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-foreground/60">Disabled: </span>
                        <span>{s.disabled ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-foreground/60">Created: </span>
                        <span>{new Date(s.created).toLocaleString()}</span>
                      </div>
                      <div className="break-words">
                        <span className="text-foreground/60">Description: </span>
                        <span>{s.description || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" onPress={() => openEdit(s)} isDisabled={loading}>
                      Edit
                    </Button>
                    <Button variant="danger" onPress={onDelete} isDisabled={loading}>
                      Delete
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="text-sm text-foreground/60">
          Volunteer dataset details will appear here once the API is connected.
        </div>
      )}

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
                  This creates a dataset subscriber record for type <span className="font-mono">volunteer</span>.
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
              <Button
                variant="secondary"
                onPress={() => setIsModalOpen(false)}
                isDisabled={loading}
              >
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
