import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";

import type { DatasetSource, DatasetSourceStore } from "./types.js";

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

/** Unique key on disk is `uri` (same as `read` / `delete` id parameter). */
function uriToFilename(uri: string) {
  return `${encodeURIComponent(uri)}.json`;
}

function normalizeDatasetSource(input: unknown): DatasetSource {
  if (!input || typeof input !== "object") throw new Error("Invalid dataset source");
  const { uri, type, disabled, name, description, created, apiKey, lastFullSync, lastIncrementalSync } = input as Record<
    string,
    unknown
  >;

  if (typeof uri !== "string" || uri.length === 0) throw new Error("Invalid uri");
  if (type !== "volunteer" && type !== "organization" && type !== "opportunity") throw new Error("Invalid type");
  if (disabled !== undefined && typeof disabled !== "boolean") throw new Error("Invalid disabled");
  if (name !== undefined && typeof name !== "string") throw new Error("Invalid name");
  if (description !== undefined && typeof description !== "string") throw new Error("Invalid description");
  if (typeof created !== "string" || created.length === 0) throw new Error("Invalid created");
  if (apiKey !== undefined && typeof apiKey !== "string") throw new Error("Invalid apiKey");
  if (lastFullSync !== undefined && typeof lastFullSync !== "string") throw new Error("Invalid lastFullSync");
  if (lastIncrementalSync !== undefined && typeof lastIncrementalSync !== "string")
    throw new Error("Invalid lastIncrementalSync");

  return {
    uri,
    type,
    disabled,
    name,
    description,
    created,
    apiKey,
    lastFullSync,
    lastIncrementalSync,
  };
}

export class FileDatasetSourceStore implements DatasetSourceStore {
  dataDir: string;

  constructor({ dataFile }: { dataFile: string }) {
    if (!dataFile) throw new Error("dataFile is required");
    const ext = path.extname(dataFile);
    const baseWithoutExt = ext ? path.basename(dataFile, ext) : path.basename(dataFile);
    this.dataDir = path.join(path.dirname(dataFile), baseWithoutExt);
  }

  _path(uri: string) {
    return path.join(this.dataDir, uriToFilename(uri));
  }

  async create(input: DatasetSource) {
    const created = input.created && input.created.length > 0 ? input.created : new Date().toISOString();
    const datasetSource = normalizeDatasetSource({ ...input, created });
    const filePath = this._path(datasetSource.uri);

    try {
      await fs.access(filePath);
      throw new Error("uri already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, datasetSource);
        return datasetSource;
      }
      throw err;
    }
  }

  async read(uri: string) {
    const raw = await readJsonFile(this._path(uri));
    if (!raw) return undefined;
    return normalizeDatasetSource(raw);
  }

  async update(datasetSource: DatasetSource) {
    const existing = await this.read(datasetSource.uri);
    if (!existing) throw new Error("NotFound");

    const merged = normalizeDatasetSource({
      ...existing,
      ...datasetSource,
      uri: datasetSource.uri,
      created: existing.created,
    });
    await writeJsonAtomic(this._path(merged.uri), merged);
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

  async list() {
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
}
