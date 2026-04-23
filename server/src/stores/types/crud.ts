export interface ListResult<T> {
    records: T[];
    cursor?: string; // if there are more records, use this cursor to fetch them
}

export interface CrudStore<Key,T,CreateParams,UpdateParams> {
    create: (params: CreateParams) => Promise<T>;
    list: (cursor?: string) => Promise<ListResult<T>>;
    read: (key: Key) => Promise<T | null>;
    update: (params: UpdateParams) => Promise<T>;
    delete: (key: Key) => Promise<void>;
}