export type URI = string;

// Query a dataset for records updated since a given time
export interface SinceQuery {
    since: string;
    [key: string]: any;
}

// query a dataset for records matching a given query
export interface AnyQuery {
    [key: string]: any;
}

// Required fields for a record in a dataset
export interface StoreRecord {
    uri: URI;
    updated: string;
    [key: string]: any;
}

// The results of the API updates query (SinceQuery or AnyQuery)
export interface DatasetUpdates<T extends StoreRecord> {
    updates: T[];
    deletes: URI[];
}

// The results of an API snapshot query
export interface SnapshotResult {
    uris: URI[]; // the URIs of all the record matching the query - any others should be deleted
    batchSize: number; // how many records can be requested at a time from the server
}

// The list of records to return
export interface BatchRead {
    uris: URI[];
}

export interface BatchRecords<T extends StoreRecord> {
    records: T[];
}

export interface SyncronizingStore<T extends StoreRecord> {
    // Push updates into the dataset
    updates: (updates: DatasetUpdates<T>) => Promise<void>;
    batchUpdate: (batch: BatchRecords<T>) => Promise<void>;

    // Pull
    queryUpdates: (query: SinceQuery) => Promise<DatasetUpdates<T>>;
    snapshot: (query: AnyQuery) => Promise<SnapshotResult>;
    batchRead: (batch: BatchRead) => Promise<BatchRecords<T>>;
}

export type DatasetType = "volunteer" | "organization" | "opportunity";
