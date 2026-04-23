import type { DatasetType } from "../types/sync.js";

// This is the unique key.  One dataset type may have multiple sources, unique by name
export interface DatasetSourceKey {
    type: DatasetType;
    name: string;
}

export interface DatasetSource extends DatasetSourceKey {
    disabled?: boolean;
    description?: string;
    baseUrl?: string;
    apiKey?: string;
    lastSnapshotSync?: string;
    lastUpdateSync?: string;
}

export interface DatasetSourceStore {
    listByType: (type: DatasetType) => Promise<DatasetSource[]>;
    read: (key: DatasetSourceKey) => Promise<DatasetSource | undefined>;
    create: (create: DatasetSource) => Promise<DatasetSource>;
    update: (update: DatasetSource) => Promise<DatasetSource>;
    delete: (key: DatasetSourceKey) => Promise<void>;
}
