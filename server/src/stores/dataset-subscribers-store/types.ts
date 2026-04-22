import type { DatasetType } from "../types.js";

export interface DatasetSubscriber {
    uid: string; // account getting access
    type: DatasetType;
    disabled?: boolean;
    name?: string;
    description?: string;
    created: string;
    apiKey?: string;
}

export interface DatasetSubscriberUpdate {
    uid: string;
    type: DatasetType;
    name?: string;
    disabled?: boolean;
    description?: string;
    apiKey?: string;
}

export interface DatasetSubscribersStore {
    list: () => Promise<DatasetSubscriber[]>;
    read: (uid: string, type: DatasetType) => Promise<DatasetSubscriber | undefined>;
    create: (input: DatasetSubscriber) => Promise<DatasetSubscriber>;
    update: (datasetSubscriber: DatasetSubscriberUpdate) => Promise<void>;
    delete: (uid: string, type: DatasetType) => Promise<void>;
}
