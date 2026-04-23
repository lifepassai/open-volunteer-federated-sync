/** Volunteer profile (minimal; extend as needed). */
export interface ApiKey {
  key: string; // unique id for this record
  uid: string; // owner
  name?: string;
}

export interface ApiKeyUpdate {
  key: string;
  name?: string | null;
}

export interface ApiKeysStore {
  listByUid: (uid: string) => Promise<ApiKey[]>;
  create: (create: ApiKey) => Promise<void>;
  read: (key: string) => Promise<ApiKey | undefined>;
  update: (update: ApiKeyUpdate) => Promise<void>;
  delete: (key: string) => Promise<void>;
}