import type { DatasetType, DatasetSubscriber, DatasetSource, VolunteerDatasetRow, ListResult } from './types'
import { consumeSseStream, type SseEvent } from './sse'
import { useAccountStore } from '../stores/accountStore'

export type { DatasetType, DatasetSubscriber, DatasetSource, VolunteerDatasetRow } from './types'
type ApiError = { failure?: { code: number, message: string, details?: string[] } }
type ApiErrorAlt = { error?: string; message?: string }

export type AccountRow = {
  uid: string
  email: string
  name?: string
  pictureUrl?: string
  role?: string
}

async function parseJsonOrThrow(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`Server returned invalid JSON (${res.status})`)
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown },
): Promise<T> {
  const account = useAccountStore.getState().account
  if (!account)
    throw new Error('Not logged in')
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${account.bearerToken}`,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const data = (await parseJsonOrThrow(res)) as T | ApiError | null
  if (res.ok)
    return data as T

  // 401 means our session is invalid/expired. 403 means "you are logged in but not allowed".
  // Only auto-logout on 401 so forbidden actions don't unexpectedly clear sessions.
  if (res.status === 401)
    useAccountStore.getState().logout()

  const msg =
    (data as ApiError)?.failure?.message ||
    (data as ApiErrorAlt)?.message ||
    `Request failed with ${res.status}: ${res.statusText}`
  throw new Error(msg)
}

export async function listVolunteerDataset(): Promise<VolunteerDatasetRow[]> {
  const res = await request<ListResult<VolunteerDatasetRow>>(`/api/volunteers`, {})
  return res.records ?? []
}

export async function listDatasetSubscribers(params: { type?: DatasetType }) {
  const q = params.type ? `?type=${encodeURIComponent(params.type)}` : ''
  return await request<DatasetSubscriber[]>(`/api/dataset-subscribers${q}`, {
  })
}

export async function createDatasetSubscriber(params: {
    type: DatasetType
    name?: string
    description?: string
    apiKey?: string
    disabled?: boolean
}) {
  return await request<DatasetSubscriber>(`/api/dataset-subscribers`, {
    method: 'POST',
    body: {
      type: params.type,
      name: params.name,
      description: params.description,
      apiKey: params.apiKey,
      disabled: params.disabled,
    },
  })
}

export async function updateDatasetSubscriber(params: {
    type: DatasetType
    name?: string
    description?: string
    apiKey?: string
    disabled?: boolean
}) : Promise<DatasetSubscriber | null> {
  return await request<DatasetSubscriber | null>(`/api/dataset-subscribers/${encodeURIComponent(params.type)}`, {
    method: 'PATCH',
    body: {
      name: params.name,
      description: params.description,
      apiKey: params.apiKey,
      disabled: params.disabled,
    },
  })
}

export async function deleteDatasetSubscriber(params: { type: DatasetType }) {
  return await request<void>(`/api/dataset-subscribers/${encodeURIComponent(params.type)}`, {
    method: 'DELETE',
  })
}

export async function listDatasetSources(params: { type?: DatasetType }) {
  const q = params.type ? `?type=${encodeURIComponent(params.type)}` : ''
  return await request<DatasetSource[]>(`/api/dataset-sources${q}`, {})
}

export async function createDatasetSource(params: {
  type: DatasetType
  name: string
  baseUrl?: string
  description?: string
  apiKey?: string
  disabled?: boolean
}) {
  return await request<DatasetSource>(`/api/dataset-sources`, {
    method: 'POST',
    body: {
      type: params.type,
      name: params.name,
      baseUrl: params.baseUrl,
      description: params.description,
      apiKey: params.apiKey,
      disabled: params.disabled,
    },
  })
}

export async function updateDatasetSource(params: {
  id: string
  name?: string
  baseUrl?: string
  description?: string
  apiKey?: string
  disabled?: boolean
}) {
  return await request<DatasetSource>(`/api/dataset-sources/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    body: {
      name: params.name,
      baseUrl: params.baseUrl,
      description: params.description,
      apiKey: params.apiKey,
      disabled: params.disabled,
    },
  })
}

export async function deleteDatasetSource(params: { id: string }) {
  return await request<void>(`/api/dataset-sources/${encodeURIComponent(params.id)}`, {
    method: 'DELETE',
  })
}

export async function listAccounts(): Promise<AccountRow[]> {
  const res = await request<{ accounts: AccountRow[] }>(`/api/accounts`, {})
  return res.accounts ?? []
}

export async function updateAccountRole(params: { uid: string; role: 'user' | 'admin' | '' }): Promise<AccountRow> {
  const res = await request<{ account: AccountRow }>(`/api/accounts/${encodeURIComponent(params.uid)}`, {
    method: 'PATCH',
    body: { role: params.role || undefined },
  })
  return res.account
}

export async function deleteAccount(params: { uid: string }) {
  return await request<void>(`/api/accounts/${encodeURIComponent(params.uid)}`, {
    method: 'DELETE',
  })
}

/**
 * Incremental sync: opens an SSE stream (fetch + manual parse) so we can send `Authorization: Bearer`.
 * Events: `progress`, `updates`, `result`, `done`, `error`.
 */
export async function triggerUpdateSyncStream(params: {
  datasourceId: string
  since?: string
  onEvent: (event: SseEvent) => void
}): Promise<void> {
  const account = useAccountStore.getState().account
  if (!account) throw new Error('Not logged in')

  const q = new URLSearchParams()
  if (params.since) q.set('since', params.since)
  const qs = q.toString()
  const path = `/api/sync/triggers/update/${encodeURIComponent(params.datasourceId)}${qs ? `?${qs}` : ''}`

  const res = await fetch(path, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${account.bearerToken}`,
    },
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    if (res.status === 401) useAccountStore.getState().logout()
    const text = await res.text()
    let msg = `Request failed with ${res.status}: ${res.statusText}`
    if (text) {
      try {
        const parsed = JSON.parse(text) as ApiError | ApiErrorAlt
        msg =
          (parsed as ApiError)?.failure?.message ||
          (parsed as ApiErrorAlt)?.message ||
          msg
      } catch {
        msg = text
      }
    }
    throw new Error(msg)
  }

  if (!res.body) throw new Error('No response body')
  if (!contentType.includes('text/event-stream')) {
    const text = await res.text()
    throw new Error(text ? `Expected event stream, got: ${text.slice(0, 240)}` : 'Expected event stream')
  }

  await consumeSseStream(res.body, (event: SseEvent) => {
    params.onEvent(event)
  })
}
