export type URI = string;

export interface SinceQuery {
    since: string;
    [key: string]: any;
}

export interface AnyQuery {
    [key: string]: any;
}

export interface StoreRecord {
    uri: URI;
    updated: string;
    [key: string]: any;
}

export interface UpdateResult<T extends StoreRecord> {
    updates: T[];
    deletes: URI[]
    since: string;
}

export interface SnapshotResult {
    uris: URI[]; // the URIs of all the record matching the query, any others should be deleted
    batchSize: number; // how many records can be requested at a time
}

export interface BatchRead {
    uris: URI[];
}

export interface BatchReadResult<T extends StoreRecord> {
    records: T[];
}

export interface SyncronizingStore<T extends StoreRecord> {
    updates: (since: SinceQuery) => Promise<UpdateResult<T>>;
    snapshot: (query: AnyQuery) => Promise<SnapshotResult>;
    batchRead: (batch: BatchRead) => Promise<BatchReadResult<T>>;
}

export type DatasetType = "volunteer" | "organization" | "opportunity";
