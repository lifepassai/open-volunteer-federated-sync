export type DatasetSubscriberType = "volunteer" | "organization" | "opportunity";

export interface DatasetSubscriber {
    uid: string; // account getting access
    type: DatasetSubscriberType;
    disabled?: boolean;
    name?: string;
    description?: string;
    created: string;
    apiKey?: string;
}

export interface DatasetSubscriberUpdate {
    uid: string;
    type: DatasetSubscriberType;
    name?: string;
    disabled?: boolean;
    description?: string;
    apiKey?: string;
}

export interface DatasetSubscribersStore {
    list: () => Promise<DatasetSubscriber[]>;
    read: (uid: string, type: DatasetSubscriberType) => Promise<DatasetSubscriber | undefined>;
    create: (input: DatasetSubscriber) => Promise<DatasetSubscriber>;
    update: (datasetSubscriber: DatasetSubscriberUpdate) => Promise<void>;
    delete: (uid: string, type: DatasetSubscriberType) => Promise<void>;
}
