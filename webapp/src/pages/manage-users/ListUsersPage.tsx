import { Avatar, Button, Card } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { GoogleLoginButton } from '../../components/GoogleLoginButton'
import { RefreshButton } from '../../components/RefreshButton'
import { IconTrash } from '../../components/icons'
import { deleteAccount, listAccounts, updateAccountRole, type AccountRow } from '../../net/serverApi'
import { useAccountStore } from '../../stores/accountStore'

type RoleChoice = 'user' | 'admin'

export function ListUsersPage() {
  const account = useAccountStore((s) => s.account)
  const isAdmin = account?.role === 'admin'

  const [users, setUsers] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteUid, setDeleteUid] = useState<string | null>(null)
  const [roleUid, setRoleUid] = useState<string | null>(null)
  const [roleChoice, setRoleChoice] = useState<RoleChoice>('user')

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
  }, [users])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listAccounts()
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    const t = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(t)
  }, [isAdmin])

  const openDelete = (uid: string) => {
    setDeleteUid(uid)
  }

  const confirmDelete = async () => {
    if (!deleteUid) return
    setLoading(true)
    setError(null)
    try {
      await deleteAccount({ uid: deleteUid })
      setDeleteUid(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const openRole = (u: AccountRow) => {
    setRoleUid(u.uid)
    setRoleChoice(u.role === 'admin' ? 'admin' : 'user')
  }

  const confirmRole = async () => {
    if (!roleUid) return
    setLoading(true)
    setError(null)
    try {
      await updateAccountRole({ uid: roleUid, role: roleChoice })
      setRoleUid(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Role update failed')
    } finally {
      setLoading(false)
    }
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-foreground/70">Sign in to manage users.</div>
        <GoogleLoginButton presentation="standard" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <h2>Users</h2>
        <div className="text-sm text-foreground/70">You don’t have access to manage users.</div>
      </div>
    )
  }

  const deleting = deleteUid ? users.find((u) => u.uid === deleteUid) : null
  const roleEditing = roleUid ? users.find((u) => u.uid === roleUid) : null

  return (
    <div className="">
      <div className="flex items-center justify-end">
        <RefreshButton
          label="Refresh users"
          loading={loading}
          onClick={() => void refresh()}
        />
      </div>
      {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

      <Card>
        <Card.Content className="p-0">
          <div className="grid grid-cols-[1fr_auto] gap-0">
            <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold text-foreground/70 dark:border-slate-800">
              Account
            </div>
            <div className="border-b border-slate-200 px-4 py-2 text-right text-xs font-semibold text-foreground/70 dark:border-slate-800">
              Actions
            </div>

            {sorted.map((u) => (
              <div key={u.uid} className="contents">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {u.pictureUrl ? <Avatar.Image src={u.pictureUrl} alt="" /> : null}
                      <Avatar.Fallback>{(u.name ?? u.email ?? 'U').slice(0, 1).toUpperCase()}</Avatar.Fallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{u.name ?? '—'}</div>
                      <div className="truncate text-sm text-foreground/70">{u.email ?? '—'}</div>
                      <button
                        type="button"
                        className={[
                          'mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                          'border-slate-200 bg-white text-slate-700 hover:bg-default-100',
                          'focus:outline-none focus:ring-2 focus:ring-slate-400/50',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                          'dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-slate-500/60',
                        ].join(' ')}
                        onClick={() => openRole(u)}
                        disabled={loading}
                        aria-label={`Edit role for ${u.email ?? u.uid}`}
                        title="Edit role"
                      >
                        {u.role ?? '—'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => openDelete(u.uid)}
                    disabled={loading}
                    aria-label={`Delete ${u.email ?? u.uid}`}
                    title="Delete user"
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
                  >
                    <IconTrash className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {deleteUid ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setDeleteUid(null)
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Delete user</h3>
                <p className="text-sm text-foreground/70">
                  This will permanently delete <span className="font-mono">{deleting?.email ?? deleteUid}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => {
                  if (!loading) setDeleteUid(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setDeleteUid(null)} isDisabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" onPress={confirmDelete} isDisabled={loading}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {roleUid ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loading) setRoleUid(null)
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">Set role</h3>
                <p className="text-sm text-foreground/70">
                  Update role for <span className="font-mono">{roleEditing?.email ?? roleUid}</span>.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-default-100"
                onClick={() => {
                  if (!loading) setRoleUid(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={roleChoice === 'user'}
                  onChange={() => setRoleChoice('user')}
                  disabled={loading}
                />
                <span>User</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={roleChoice === 'admin'}
                  onChange={() => setRoleChoice('admin')}
                  disabled={loading}
                />
                <span>Admin</span>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onPress={() => setRoleUid(null)} isDisabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" onPress={confirmRole} isDisabled={loading}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

