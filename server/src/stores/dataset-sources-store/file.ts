import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { DatasetSource, DatasetSourceStore } from "./types.js";
import type { DatasetType } from "../types/sync.js";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

function idToFilename(id: string) {
  return `${encodeURIComponent(id)}.json`;
}

function normalizeDatasetSource(input: unknown, fallbackId?: string): DatasetSource {
  if (!input || typeof input !== "object") throw new Error("Invalid dataset source");
  const {
    id,
    type,
    disabled,
    name,
    description,
    baseUrl,
    apiKey,
    lastSnapshotSync,
    lastUpdateSync,
  } = input as Record<string, unknown>;

  const outId = (typeof id === "string" && id.length > 0) ? id : fallbackId;
  if (!outId) throw new Error("Invalid id");
  if (type !== "volunteer" && type !== "organization" && type !== "opportunity") throw new Error("Invalid type");
  if (disabled !== undefined && typeof disabled !== "boolean") throw new Error("Invalid disabled");
  if (!name || typeof name !== "string") throw new Error("Invalid name");
  if (description !== undefined && typeof description !== "string") throw new Error("Invalid description");
  if (baseUrl !== undefined && typeof baseUrl !== "string") throw new Error("Invalid baseUrl");
  if (apiKey !== undefined && typeof apiKey !== "string") throw new Error("Invalid apiKey");
  if (lastSnapshotSync !== undefined && typeof lastSnapshotSync !== "string") throw new Error("Invalid lastSnapshotSync");
  if (lastUpdateSync !== undefined && typeof lastUpdateSync !== "string") throw new Error("Invalid lastUpdateSync");

  return {
    id: outId,
    type,
    disabled,
    name,
    description,
    baseUrl,
    apiKey,
    lastSnapshotSync,
    lastUpdateSync,
  };
}

export class FileDatasetSourceStore implements DatasetSourceStore {
  dataDir: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("dataset-sources");
  }

  _path(id: string) {
    return path.join(this.dataDir, idToFilename(id));
  }

  async create(input: Omit<DatasetSource, "id"> & { id?: string }) {
    const id = randomUUID();
    const datasetSource = normalizeDatasetSource({ ...input, id });
    const filePath = this._path(datasetSource.id);

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

  async read(id: string) {
    const raw = await readJsonFile(this._path(id));
    if (!raw) return undefined;
    return normalizeDatasetSource(raw, id);
  }

  async update(datasetSource: DatasetSource) {
    const existing = await this.read(datasetSource.id);
    if (!existing) throw new Error("NotFound");

    const merged = normalizeDatasetSource({
      ...existing,
      ...datasetSource,
      id: datasetSource.id,
    });
    await writeJsonAtomic(this._path(merged.id), merged);
    return merged;
  }

  async delete(id: string) {
    try {
      await fs.unlink(this._path(id));
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
        const fallbackId = decodeURIComponent(name.slice(0, -".json".length));
        out.push(normalizeDatasetSource(raw, fallbackId));
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
}
