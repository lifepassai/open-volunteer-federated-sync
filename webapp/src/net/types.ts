export type DatasetSubscriberType = 'volunteer' | 'organization' | 'opportunity'

export type DatasetSubscriber = {
  uid: string
  type: DatasetSubscriberType
  disabled?: boolean
  name?: string
  description?: string
  created: string
  apiKey?: string
}