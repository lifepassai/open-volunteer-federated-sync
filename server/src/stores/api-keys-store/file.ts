import * as fs from "node:fs/promises";
import path from "node:path";

import type { ApiKey, ApiKeysStore, ApiKeyUpdate } from "./types.js";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

function keyToFilename(key: string) {
  return `${encodeURIComponent(key)}.json`;
}

function normalizeApiKey(input: unknown): ApiKey {
  if (!input || typeof input !== "object") throw new Error("Invalid api key");
  const { key, uid, name } = input as Record<string, unknown>;

  if (typeof key !== "string" || key.length === 0) throw new Error("Invalid key");
  if (typeof uid !== "string" || uid.length === 0) throw new Error("Invalid uid");
  if (name !== undefined && typeof name !== "string") throw new Error("Invalid name");

  return { key, uid, name };
}

export class FileApiKeysStore implements ApiKeysStore {
  dataDir: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("api-keys");
  }

  _path(key: string) {
    return path.join(this.dataDir, keyToFilename(key));
  }

  async listByUid(uid: string) {
    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return [];
      throw err;
    }

    const out: ApiKey[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        const normalized = normalizeApiKey(raw);
        if (normalized.uid === uid) out.push(normalized);
      } catch {
        // skip invalid
      }
    }
    return out;
  }

  async create(create: ApiKey) {
    const apiKey = normalizeApiKey(create);
    const filePath = this._path(apiKey.key);
    try {
      await fs.access(filePath);
      throw new Error("api key already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, apiKey);
        return;
      }
      throw err;
    }
  }

  async read(key: string) {
    const raw = await readJsonFile(this._path(key));
    if (!raw) return undefined;
    return normalizeApiKey(raw);
  }

  async update(update: ApiKeyUpdate) {
    if (!update || typeof update !== "object") throw new Error("Invalid update");
    if (typeof update.key !== "string" || update.key.length === 0) throw new Error("Invalid key");
    if (update.name !== undefined && update.name !== null && typeof update.name !== "string")
      throw new Error("Invalid name");

    const existing = await this.read(update.key);
    if (!existing) throw new Error("NotFound");

    const merged: ApiKey = normalizeApiKey({
      ...existing,
      name: update.name === null ? undefined : update.name,
      key: existing.key,
      uid: existing.uid,
    });
    await writeJsonAtomic(this._path(merged.key), merged);
  }

  async delete(key: string) {
    try {
      await fs.unlink(this._path(key));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return;
      throw err;
    }
  }
}
