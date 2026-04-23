import * as fs from "node:fs/promises";
import path from "node:path";

import type { DatasetSource, DatasetSourceKey, DatasetSourceStore } from "./types.js";
import type { DatasetType } from "../types.js";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

function keyToFilename(key: DatasetSourceKey) {
  return `${encodeURIComponent(key.uid)}_${key.type}.json`;
}

function normalizeDatasetSource(input: unknown): DatasetSource {
  if (!input || typeof input !== "object") throw new Error("Invalid dataset source");
  const {
    uid,
    type,
    disabled,
    name,
    description,
    baseUrl,
    apiKey,
    lastFullSync,
    lastIncrementalSync,
  } = input as Record<string, unknown>;

  if (typeof uid !== "string" || uid.length === 0) throw new Error("Invalid uid");
  if (type !== "volunteer" && type !== "organization" && type !== "opportunity") throw new Error("Invalid type");
  if (disabled !== undefined && typeof disabled !== "boolean") throw new Error("Invalid disabled");
  if (name !== undefined && typeof name !== "string") throw new Error("Invalid name");
  if (description !== undefined && typeof description !== "string") throw new Error("Invalid description");
  if (baseUrl !== undefined && typeof baseUrl !== "string") throw new Error("Invalid baseUrl");
  if (apiKey !== undefined && typeof apiKey !== "string") throw new Error("Invalid apiKey");
  if (lastFullSync !== undefined && typeof lastFullSync !== "string") throw new Error("Invalid lastFullSync");
  if (lastIncrementalSync !== undefined && typeof lastIncrementalSync !== "string")
    throw new Error("Invalid lastIncrementalSync");

  return {
    uid,
    type,
    disabled,
    name,
    description,
    baseUrl,
    apiKey,
    lastFullSync,
    lastIncrementalSync,
  };
}

export class FileDatasetSourceStore implements DatasetSourceStore {
  dataDir: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("dataset-sources");
  }

  _path(key: DatasetSourceKey) {
    return path.join(this.dataDir, keyToFilename(key));
  }

  async create(input: DatasetSource) {
    const datasetSource = normalizeDatasetSource(input);
    const filePath = this._path({ uid: datasetSource.uid, type: datasetSource.type });

    try {
      await fs.access(filePath);
      throw new Error("dataset source already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, datasetSource);
        return datasetSource;
      }
      throw err;
    }
  }

  async read(key: DatasetSourceKey) {
    const raw = await readJsonFile(this._path(key));
    if (!raw) return undefined;
    return normalizeDatasetSource(raw);
  }

  async update(datasetSource: DatasetSource) {
    const existing = await this.read({ uid: datasetSource.uid, type: datasetSource.type });
    if (!existing) throw new Error("NotFound");

    const merged = normalizeDatasetSource({
      ...existing,
      ...datasetSource,
      uid: datasetSource.uid,
      type: datasetSource.type,
    });
    await writeJsonAtomic(this._path({ uid: merged.uid, type: merged.type }), merged);
    return merged;
  }

  async delete(key: DatasetSourceKey) {
    try {
      await fs.unlink(this._path(key));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") return;
      throw err;
    }
  }

  async listAll() {
    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") return [];
      throw err;
    }

    const out: DatasetSource[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(normalizeDatasetSource(raw));
      } catch {
        // skip invalid
      }
    }
    return out;
  }

  async listByType(type: DatasetType) {
    const all = await this.listAll();
    return all.filter((s) => s.type === type);
  }

  async listByUid(uid: string) {
    const all = await this.listAll();
    return all.filter((s) => s.uid === uid);
  }
}
