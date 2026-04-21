import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";

import type { DatasetSubscriber, DatasetSubscribersStore, DatasetSubscriberType, DatasetSubscriberUpdate } from "./types.js";

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

function subscriberToFilename(uid: string, type: DatasetSubscriberType) {
  return `${encodeURIComponent(uid)}.${type}.json`;
}

function normalizeDatasetSubscriber(input: unknown): DatasetSubscriber {
  if (!input || typeof input !== "object") throw new Error("Invalid dataset subscriber");
  const { uid, type, disabled, name, description, created, apiKey } = input as Record<string, unknown>;

  if (typeof uid !== "string" || uid.length === 0) throw new Error("Invalid uid");
  if (type !== "volunteer" && type !== "organization" && type !== "opportunity") throw new Error("Invalid type");
  if (disabled !== undefined && typeof disabled !== "boolean") throw new Error("Invalid disabled");
  if (name !== undefined && typeof name !== "string") throw new Error("Invalid name");
  if (description !== undefined && typeof description !== "string") throw new Error("Invalid description");
  if (typeof created !== "string" || created.length === 0) throw new Error("Invalid created");
  if (apiKey !== undefined && typeof apiKey !== "string") throw new Error("Invalid apiKey");

  return { uid, type, disabled, name, description, created, apiKey };
}

export class FileDatasetSubscribersStore implements DatasetSubscribersStore {
  dataDir: string;

  constructor({ dataFile }: { dataFile: string }) {
    if (!dataFile) throw new Error("dataFile is required");
    const ext = path.extname(dataFile);
    const baseWithoutExt = ext ? path.basename(dataFile, ext) : path.basename(dataFile);
    this.dataDir = path.join(path.dirname(dataFile), baseWithoutExt);
  }

  _path(uid: string, type: DatasetSubscriberType) {
    return path.join(this.dataDir, subscriberToFilename(uid, type));
  }

  async create(input: DatasetSubscriber) {
    const created = input.created && input.created.length > 0 ? input.created : new Date().toISOString();
    const datasetSubscriber = normalizeDatasetSubscriber({ ...input, created });
    const filePath = this._path(datasetSubscriber.uid, datasetSubscriber.type);

    try {
      await fs.access(filePath);
      throw new Error("subscriber already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, datasetSubscriber);
        return datasetSubscriber;
      }
      throw err;
    }
  }

  async read(uid: string, type: DatasetSubscriberType) {
    const raw = await readJsonFile(this._path(uid, type));
    if (!raw) return undefined;
    return normalizeDatasetSubscriber(raw);
  }

  async update(datasetSubscriber: DatasetSubscriberUpdate) {
    const existing = await this.read(datasetSubscriber.uid, datasetSubscriber.type);
    if (!existing) throw new Error("NotFound");

    const merged = normalizeDatasetSubscriber({
      ...existing,
      ...datasetSubscriber,
      uid: existing.uid,
      type: existing.type,
      created: existing.created,
    });
    await writeJsonAtomic(this._path(merged.uid, merged.type), merged);
  }

  async delete(uid: string, type: DatasetSubscriberType) {
    try {
      await fs.unlink(this._path(uid, type));
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

    const out: DatasetSubscriber[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(normalizeDatasetSubscriber(raw));
      } catch {
        // skip invalid
      }
    }
    return out;
  }
}

