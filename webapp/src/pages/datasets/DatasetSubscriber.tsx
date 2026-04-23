import { Button, Card } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { GoogleLoginButton } from '../../components/GoogleLoginButton'
import { useAccountStore } from '../../stores/accountStore'
import {
  createDatasetSubscriber,
  deleteDatasetSubscriber,
  listDatasetSubscribers,
  updateDatasetSubscriber,
  type DatasetSubscriber as DatasetSubscriberRow,
  type DatasetType,
} from '../../net/serverApi'
import { FullSyncModal } from './FullSyncModal'
import { UpdateSyncModal } from './UpdateSyncModal'

export function DatasetSubscriber(props: {
  type: DatasetType
  title?: string
  description?: string
}) {
  const { type, title = 'My subscription', description = 'Your subscription settings for this dataset.' } = props
  const account = useAccountStore((s) => s.account)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<DatasetSubscriberRow[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mode, setMode] = useState<'subscribe' | 'edit'>('subscribe')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formDisabled, setFormDisabled] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

  const [updateSyncModalOpen, setUpdateSyncModalOpen] = useState(false)
  const [fullSyncModalOpen, setFullSyncModalOpen] = useState(false)

  const myRow = useMemo(() => {
    if (!account) return null
    return rows.find((r) => r.uid === account.uid && r.type === type) ?? null
  }, [account, rows, type])

  const refresh = useCallback(async () => {
    if (!account?.uid) return
    setLoading(true)
    setError(null)
    try {
      const list = await listDatasetSubscribers({ type })
      setRows(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }, [account?.uid, type])

  useEffect(() => {
    if (!account?.uid) return
    const t = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(t)
  }, [account?.uid, refresh])

  const openSubscribe = () => {
    setMode('subscribe')
    setFormName('')
    setFormDescription('')
    setFormApiKey('')
    setFormDisabled(false)
    setShowApiKey(false)
    setApiKeyCopied(false)
    setIsModalOpen(true)
  }

  const openEdit = () => {
    if (!myRow) return
    setMode('edit')
    setFormName(myRow.name ?? '')
    setFormDescription(myRow.description ?? '')
    setFormApiKey(myRow.apiKey ?? '')
    setFormDisabled(Boolean(myRow.disabled))
    setShowApiKey(false)
    setApiKeyCopied(false)
    setIsModalOpen(true)
  }

  const onSubmit = async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'edit') {
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
      await deleteDatasetSubscriber({ type })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const displayedApiKey = useMemo(() => {
    const key = myRow?.apiKey
    if (!key) return null
    if (showApiKey) return key
    const tail = key.slice(-4)
    return `•••• ${tail}`
  }, [myRow?.apiKey, showApiKey])

  const copyApiKey = async () => {
    const key = myRow?.apiKey
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      setApiKeyCopied(true)
      window.setTimeout(() => setApiKeyCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  if (!account) {
    return (
      <Card>
        <Card.Content className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3>{title}</h3>
            <p className="text-sm text-foreground/70">Sign in to manage your subscription.</p>
          </div>
          <GoogleLoginButton />
        </Card.Content>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h3>{title}</h3>
              <p className="text-sm text-foreground/70">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {myRow ? null : (
                <Button variant="primary" onPress={openSubscribe} isDisabled={loading}>
                  Subscribe
                </Button>
              )}
            </div>
          </div>

          {myRow ? (
            <div className="mt-4 border-t border-default-200 pt-4">
              <div className="relative">
                <div className="absolute right-0 top-0 flex items-center gap-2">
                  <Button variant="secondary" onPress={openEdit} isDisabled={loading}>
                    Edit
                  </Button>
                  <Button variant="danger" onPress={onDelete} isDisabled={loading}>
                    Delete
                  </Button>
                </div>

                <div className="grid gap-2 pr-28 text-sm">
                  <div>
                    <span className="text-foreground/60">Name: </span>
                    <span>{myRow.name ?? '—'}</span>
                  </div>
                  <div className="break-words">
                    <span className="text-foreground/60">Description: </span>
                    <span>{myRow.description ?? '—'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-foreground/60">API key: </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono break-all">{displayedApiKey ?? '—'}</span>
                        {myRow.apiKey ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-default-100 disabled:opacity-50"
                              onClick={() => setShowApiKey((v) => !v)}
                              disabled={loading}
                              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                              title={showApiKey ? 'Hide API key' : 'Show API key'}
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                <path
                                  d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-default-100 disabled:opacity-50"
                              onClick={copyApiKey}
                              disabled={loading}
                              aria-label="Copy API key"
                              title="Copy API key"
                            >
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                <path
                                  d="M9 9h10v12H9V9Z"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            {apiKeyCopied ? <span className="text-xs text-foreground/60">Copied</span> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-foreground/60">Disabled: </span>
                    <span>{myRow.disabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-foreground/60">Created: </span>
                    <span>{new Date(myRow.created).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {myRow ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-default-200 pt-4">
              <Button
                variant="secondary"
                onPress={() => setUpdateSyncModalOpen(true)}
                isDisabled={loading}
              >
                Sync Updates
              </Button>
              <Button
                variant="secondary"
                onPress={() => setFullSyncModalOpen(true)}
                isDisabled={loading}
              >
                Full Sync
              </Button>
            </div>
          ) : null}
        </Card.Content>
      </Card>

      {error ? (
        <div className="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
          {error}
        </div>
      ) : null}

      {updateSyncModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setUpdateSyncModalOpen(false)
            }}
            aria-hidden="true"
          />
          <UpdateSyncModal
            onClose={() => setUpdateSyncModalOpen(false)}
            onStart={() => {
              setUpdateSyncModalOpen(false)
            }}
            loading={loading}
          />
        </div>
      ) : null}

      {fullSyncModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setFullSyncModalOpen(false)
            }}
            aria-hidden="true"
          />
          <FullSyncModal
            onClose={() => setFullSyncModalOpen(false)}
            onStart={() => {
              setFullSyncModalOpen(false)
            }}
            loading={loading}
          />
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
                <h3 className="truncate">{mode === 'edit' ? 'Edit subscription' : 'Subscribe'}</h3>
                <p className="text-sm text-foreground/70">
                  Dataset type <span className="font-mono">{type}</span>.
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
    </div>
  )
}

