import type { Account, AccountStore, AccountUpdate, CreateAccount, KeylessAccount } from "./types.js";
import { accountFromCreate, normalizeAccount, toKeylessAccount } from "./normalize.js";

export class MemoryAccountStore implements AccountStore {
  private nextUid = 1;
  private byUid = new Map<string, Account>();
  private emailToUid = new Map<string, string>();

  async create(account: CreateAccount): Promise<Account> {
    if (!account.email) throw new Error("email is required");
    if (this.emailToUid.has(account.email)) throw new Error("email already exists");
    const uid = String(this.nextUid++);
    const created = accountFromCreate(uid, account);
    this.byUid.set(uid, created);
    this.emailToUid.set(account.email, uid);
    return { ...created };
  }

  async read(uid: string): Promise<Account | undefined> {
    const a = this.byUid.get(uid);
    return a ? { ...a } : undefined;
  }

  async readByEmail(email: string): Promise<Account | undefined> {
    const uid = this.emailToUid.get(email);
    if (!uid) return undefined;
    return this.read(uid);
  }

  async update(update: AccountUpdate): Promise<void> {
    if (!update.uid) throw new Error("uid is required");
    const existing = this.byUid.get(update.uid);
    if (!existing) throw new Error("NotFound");
    const merged = normalizeAccount({
      ...existing,
      ...update,
      uid: existing.uid,
      email: existing.email,
    });
    this.byUid.set(merged.uid, merged);
  }

  async delete(uid: string): Promise<void> {
    const existing = this.byUid.get(uid);
    if (!existing) return;
    this.emailToUid.delete(existing.email);
    this.byUid.delete(uid);
  }

  async list(): Promise<KeylessAccount[]> {
    return Array.from(this.byUid.values()).map((a) => toKeylessAccount(a));
  }
}
