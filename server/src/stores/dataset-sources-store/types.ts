export interface DatasetSource {
    uri: string; // unique key
    type: "volunteer" | "organization" | "opportunity";
    disabled?: boolean;
    name?: string;
    description?: string;
    created: string;
    apiKey?: string;
    lastFullSync?: string;
    lastIncrementalSync?: string;
}

export interface DatasetSourceUpdate {
    type: "volunteer" | "organization" | "opportunity";
    name?: string;
    description?: string;
    apiKey?: string;
}

export interface DatasetSourceStore {
    list: () => Promise<DatasetSource[]>;
    read: (uri: string) => Promise<DatasetSource | undefined>;
    create: (input: DatasetSource) => Promise<DatasetSource>;
    update: (datasetSource: DatasetSource) => Promise<DatasetSource>;
    delete: (id: string) => Promise<void>;
}
