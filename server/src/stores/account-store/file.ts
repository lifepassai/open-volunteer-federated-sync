import * as fs from "node:fs/promises";
import path from "node:path";

import type { Account, AccountStore, AccountUpdate, CreateAccount, KeylessAccount } from "./types.js";
import { accountFromCreate, normalizeAccount, toKeylessAccount } from "./normalize.js";
import { defaultStoreDir, readJsonFile, writeJsonAtomic, ensureDir } from "../../utils/file.js";

type Meta = {
  nextUid: number;
  emailToUid: Record<string, string>;
};

function parseUidSeq(uid: string): number | undefined {
  const n = Number.parseInt(uid, 10);
  return Number.isFinite(n) && String(n) === uid ? n : undefined;
}

/** File layout: `meta.json`, `data/{uid}.json`; sequential integer uids as decimal strings. */
export class FileAccountStore implements AccountStore {
  accountsDir: string;
  private dataDir: string;
  private metaPath: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.accountsDir = dir && dir.length > 0 ? dir : defaultStoreDir("accounts");
    this.dataDir = path.join(this.accountsDir, "data");
    this.metaPath = path.join(this.accountsDir, "meta.json");
  }

  _accountPath(uid: string) {
    return path.join(this.dataDir, `${uid}.json`);
  }

  private async _readMeta(): Promise<Meta | null> {
    const raw = await readJsonFile(this.metaPath);
    if (!raw || typeof raw !== "object") return null;
    const { nextUid, emailToUid } = raw as Record<string, unknown>;
    if (typeof nextUid !== "number" || !Number.isFinite(nextUid)) return null;
    if (!emailToUid || typeof emailToUid !== "object") return null;
    return { nextUid, emailToUid: { ...(emailToUid as Record<string, string>) } };
  }

  private async _writeMeta(meta: Meta) {
    await writeJsonAtomic(this.metaPath, meta);
  }

  private async _ensureInitialized() {
    await ensureDir(this.dataDir);
    const meta = await this._readMeta();
    if (meta) return;
    await this._writeMeta({ nextUid: 1, emailToUid: {} });
  }

  async create(account: CreateAccount): Promise<Account> {
    await this._ensureInitialized();
    if (typeof account.email !== "string" || account.email.length === 0) {
      throw new Error("email is required");
    }

    let meta = await this._readMeta();
    if (!meta) {
      meta = { nextUid: 1, emailToUid: {} };
    }
    if (meta.emailToUid[account.email]) {
      throw new Error("email already exists");
    }

    const uid = String(meta.nextUid++);
    const created = accountFromCreate(uid, account);
    await writeJsonAtomic(this._accountPath(uid), created);
    meta.emailToUid[account.email] = uid;
    await this._writeMeta(meta);
    return created;
  }

  async read(uid: string): Promise<Account | undefined> {
    await this._ensureInitialized();
    const raw = await readJsonFile(this._accountPath(uid));
    if (!raw) return undefined;
    return normalizeAccount(raw);
  }

  async readByEmail(email: string): Promise<Account | undefined> {
    await this._ensureInitialized();
    const meta = await this._readMeta();
    if (!meta) return undefined;
    const uid = meta.emailToUid[email];
    if (!uid) return undefined;
    return this.read(uid);
  }

  async update(update: AccountUpdate): Promise<void> {
    await this._ensureInitialized();
    if (typeof update.uid !== "string" || update.uid.length === 0) {
      throw new Error("uid is required");
    }
    const existing = await this.read(update.uid);
    if (!existing) throw new Error("NotFound");

    const merged = normalizeAccount({
      ...existing,
      ...update,
      uid: existing.uid,
      email: existing.email,
    });
    await writeJsonAtomic(this._accountPath(merged.uid), merged);
  }

  async delete(uid: string): Promise<void> {
    await this._ensureInitialized();
    const existing = await this.read(uid);
    if (!existing) {
      try {
        await fs.unlink(this._accountPath(uid));
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
          return;
        throw err;
      }
      return;
    }

    const meta = await this._readMeta();
    if (meta) {
      delete meta.emailToUid[existing.email];
      await this._writeMeta(meta);
    }
    try {
      await fs.unlink(this._accountPath(uid));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return;
      throw err;
    }
  }

  async list(): Promise<KeylessAccount[]> {
    await this._ensureInitialized();
    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return [];
      throw err;
    }

    const out: KeylessAccount[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(toKeylessAccount(normalizeAccount(raw)));
      } catch {
        // skip invalid
      }
    }
    return out;
  }
}
