export type DatasetType = 'volunteer' | 'organization' | 'opportunity'

export type DatasetSubscriber = {
  uid: string
  type: DatasetType
  disabled?: boolean
  name?: string
  description?: string
  created: string
  apiKey?: string
}

export type DatasetSource = {
  id: string
  type: DatasetType
  name: string
  disabled?: boolean
  description?: string
  baseUrl?: string
  apiKey?: string
  lastSnapshotSync?: string
  lastUpdateSync?: string
}

/** Row shape from `GET /api/datasets/volunteers` (matches server Volunteer / StoreRecord). */
export type VolunteerDatasetRow = {
  uri: string
  updated: string
  created: string
  name?: string
  location?: string
}

export type ListResult<T> = {
  records: T[]
  cursor?: string
}