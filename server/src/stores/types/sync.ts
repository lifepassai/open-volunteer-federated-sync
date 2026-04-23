export type URI = string;
export type Timestamp = string; // ISO 8601 timestamp of the last update to the record.  May include microseconds.

// Required fields for a record in a dataset
export interface SyncRecord {
    uri: URI;
    updated: Timestamp; // ISO 8601 timestamp of the last update to the record.  May include microseconds.
    [key: string]: any;
}

//
// Queries
//

// Query a dataset for records
// Supports pagination via limit and cursor
export interface AnyQuery {
    limit?: number;  // max number of records to fetch
    cursor?: string; // cursor from the previous response to continue fetching records
    [key: string]: any;
}

// Query a dataset for records updated since a given time
// and matching a query to support subsets of the dataset.
// Supports pagination via limit and cursor
export interface SinceQuery extends AnyQuery {
    since: Timestamp;
}

// Request a specific set of records.  The results may be truncated, so the caller
// should be prepared to re-request any records not returned in the batch result.
// This purposely doesnt use a cursor and transfers that logic to the client, as the cursor
// shape for a large request could become onerous.  BatchReads should be "smaller", e.g. 100 records
// at a time
export interface BatchRead {
    uris: URI[];
}

//
// Query Results
//

// The results of the API updates query (SinceQuery or AnyQuery)
// May be a truncated result of what was requested by the caller and the cursor
// should be used to request the next batch of records.
// Records deleted since the last update should be included in the "deleted" list.
export interface QueryUpdatesResult<T extends SyncRecord> {
    updates: T[];
    deleted: URI[];
    cursor?: string;    // Indicates there are more records to return - use this cursor to fetch them
}

// The results of an API snapshot query
export interface SnapshotResult {
    uris: URI[];        // the URIs of all the record matching the query - any others should be deleted
    cursor?: string;    // if there are more records, use this cursor to fetch them
    batchSize?: number; // For batchReads, max number of records can be requested at a time from this server
}

// This result may be truncated and not include all the records requested by the caller.
// It is up to the caller to re-request any records not returned in the current batch result.
export interface BatchReadResult<T extends SyncRecord> {
    records: T[];
    deleted?: URI[]; // any requested records that no longer exist in the dataset
}

//
// Push/Updates
//

// Updates to the dataset
// TODO: How to determine which records can be updated by a
// specific datasource... Likely scope by URI host/domain
export interface DatasetUpdates<T extends SyncRecord> {
    updates: T[];
    deletes: URI[];
}

export interface DatasetUpdateResult {
    updated: URI[];
    deleted: URI[];
    ignored: URI[];     // records that were not updated/deleted because they are not permitted for the URI
    batchSize?: number; // For subsequent updates, please limit the number of records to this value
}

export interface SyncronizingStore<T extends SyncRecord> {
    // Pull
    queryUpdates: (query: SinceQuery) => Promise<QueryUpdatesResult<T>>;
    snapshot: (query: AnyQuery) => Promise<SnapshotResult>;
    batchRead: (batch: BatchRead) => Promise<BatchReadResult<T>>;

    // Push updates into the dataset
    updates: (updates: DatasetUpdates<T>) => Promise<DatasetUpdateResult>;
}

export type DatasetType = "volunteer" | "organization" | "opportunity";
