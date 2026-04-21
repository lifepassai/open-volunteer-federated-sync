export interface Account {
    uid: string;
    email: string;
    name?: string;
    pictureUrl?: string;
    role?: string;
    sessionKey?: string;  // Bearer token = uid:sessionKey
}

export interface AccountUpdate extends Omit<Account, 'email'> {}
export interface KeylessAccount extends Omit<Account, 'sessionKey'> {}
export interface CreateAccount extends Omit<Account, 'uid'> {}

export interface AccountStore {
    create: (account: CreateAccount) => Promise<Account>;
    read: (uid: string) => Promise<Account | undefined>;
    readByEmail: (email: string) => Promise<Account | undefined>;
    update: (update: AccountUpdate) => Promise<void>;
    delete: (uid: string) => Promise<void>;
    list: () => Promise<KeylessAccount[]>;
}
