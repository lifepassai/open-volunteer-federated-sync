import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";

import type { Account, AccountStore, AccountUpdate, CreateAccount, KeylessAccount } from "./types.js";
import { accountFromCreate, normalizeAccount, toKeylessAccount } from "./normalize.js";

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
      return null;
    throw err;
  }
}

async function writeJsonAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = `${filePath}.tmp.${nodeCrypto.randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

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
  legacyAccountsFile: string;
  private dataDir: string;
  private metaPath: string;
  private migrationDone = false;

  constructor({ accountsFile }: { accountsFile: string }) {
    if (!accountsFile) throw new Error("accountsFile is required");
    const ext = path.extname(accountsFile);
    const baseWithoutExt = ext ? path.basename(accountsFile, ext) : path.basename(accountsFile);
    this.accountsDir = path.join(path.dirname(accountsFile), baseWithoutExt);
    this.legacyAccountsFile = accountsFile;
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

  private async _migrateLegacyMonolithIfNeeded() {
    let st: { isFile(): boolean };
    try {
      st = (await fs.stat(this.legacyAccountsFile)) as { isFile(): boolean };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return;
      throw err;
    }
    if (!st.isFile()) return;

    const data = (await readJsonFile(this.legacyAccountsFile)) as {
      accountsByUid?: Record<string, unknown>;
    } | null;
    if (!data?.accountsByUid || typeof data.accountsByUid !== "object") return;

    await ensureDir(this.dataDir);
    let seq = 1;
    const emailToUid: Record<string, string> = {};
    for (const acc of Object.values(data.accountsByUid)) {
      if (!acc || typeof acc !== "object") continue;
      const row = acc as Record<string, unknown>;
      const email = typeof row.email === "string" ? row.email : "";
      if (!email) continue;
      const uid = typeof row.uid === "string" && row.uid ? row.uid : String(seq++);
      const account = normalizeAccount({ ...row, uid, email });
      emailToUid[email] = account.uid;
      await writeJsonAtomic(this._accountPath(account.uid), account);
      const n = parseUidSeq(account.uid);
      if (n !== undefined && n >= seq) seq = n + 1;
    }
    await this._writeMeta({ nextUid: seq, emailToUid });
    await fs.rename(this.legacyAccountsFile, `${this.legacyAccountsFile}.migrated`);
  }

  /** Migrate email-filename JSON files and/or data/*.json into meta + uid-keyed files. */
  private async _migrateLooseAndBuildMetaIfNeeded() {
    let meta = await this._readMeta();
    if (meta) return;

    await ensureDir(this.dataDir);
    await this._migrateLegacyMonolithIfNeeded();
    meta = await this._readMeta();
    if (meta) return;

    const emailToUid: Record<string, string> = {};
    let nextUid = 1;

    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch {
      names = [];
    }
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw || typeof raw !== "object") continue;
      try {
        const a = normalizeAccount(raw);
        emailToUid[a.email] = a.uid;
        const n = parseUidSeq(a.uid);
        if (n !== undefined && n >= nextUid) nextUid = n + 1;
      } catch {
        // skip
      }
    }

    try {
      names = await fs.readdir(this.accountsDir);
    } catch {
      names = [];
    }
    for (const name of names) {
      if (!name.endsWith(".json") || name === "meta.json") continue;
      const filePath = path.join(this.accountsDir, name);
      try {
        const st = await fs.stat(filePath);
        if (!st.isFile()) continue;
      } catch {
        continue;
      }
      const raw = await readJsonFile(filePath);
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      if (typeof row.uid === "string" && row.uid.length > 0) continue;

      const email =
        typeof row.email === "string"
          ? row.email
          : decodeURIComponent(name.replace(/\.json$/, ""));
      if (!email || emailToUid[email]) continue;

      const uid = String(nextUid++);
      const account = accountFromCreate(uid, {
        email,
        ...(typeof row.name === "string" ? { name: row.name } : {}),
        ...(typeof row.pictureUrl === "string" ? { pictureUrl: row.pictureUrl } : {}),
        ...(typeof row.role === "string" ? { role: row.role } : {}),
        ...(typeof row.sessionKey === "string" ? { sessionKey: row.sessionKey } : {}),
      });
      emailToUid[email] = uid;
      await writeJsonAtomic(this._accountPath(uid), account);
      if (path.resolve(filePath) !== path.resolve(this._accountPath(uid))) {
        await fs.unlink(filePath).catch(() => {});
      }
    }

    await this._writeMeta({ nextUid, emailToUid });
  }

  private async _ensureMigrated() {
    if (this.migrationDone) return;
    this.migrationDone = true;
    await this._migrateLooseAndBuildMetaIfNeeded();
  }

  async create(account: CreateAccount): Promise<Account> {
    await this._ensureMigrated();
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
    await this._ensureMigrated();
    const raw = await readJsonFile(this._accountPath(uid));
    if (!raw) return undefined;
    return normalizeAccount(raw);
  }

  async readByEmail(email: string): Promise<Account | undefined> {
    await this._ensureMigrated();
    const meta = await this._readMeta();
    if (!meta) return undefined;
    const uid = meta.emailToUid[email];
    if (!uid) return undefined;
    return this.read(uid);
  }

  async update(update: AccountUpdate): Promise<void> {
    await this._ensureMigrated();
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
    await this._ensureMigrated();
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
    await this._ensureMigrated();
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
