import type { DatasetSubscriberType, DatasetSubscriber } from './types'
import { useAccountStore } from '../stores/accountStore'

export type { DatasetSubscriberType, DatasetSubscriber } from './types'
type ApiError = { failure?: { code: number, message: string, details?: string[] } }

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

  if ( res.status === 401 || res.status === 403 )
    useAccountStore.getState().logout()

  throw new Error( (data as ApiError)?.failure?.message || `Request failed with ${res.status}: ${res.statusText}`)
}

export async function listDatasetSubscribers(params: { type?: DatasetSubscriberType }) {
  const q = params.type ? `?type=${encodeURIComponent(params.type)}` : ''
  return await request<DatasetSubscriber[]>(`/api/dataset-subscribers${q}`, {
  })
}

export async function createDatasetSubscriber(params: {
    type: DatasetSubscriberType
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
    type: DatasetSubscriberType
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

export async function deleteDatasetSubscriber(params: { type: DatasetSubscriberType }) {
  return await request<void>(`/api/dataset-subscribers/${encodeURIComponent(params.type)}`, {
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


