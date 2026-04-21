import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";

import type { AnyQuery, BatchRead, BatchReadResult, SinceQuery, SnapshotResult, UpdateResult } from "../types.js";
import type { CreateVolunteerParams, UpdateVolunteerParams, Volunteer, VolunteerStore } from "./types.js";

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

function normalizeVolunteer(input: unknown): Volunteer {
  if (!input || typeof input !== "object") throw new Error("Invalid volunteer");
  const { uri, name, location, created, updated } = input as Record<string, unknown>;
  if (typeof uri !== "string" || uri.length === 0) throw new Error("Invalid uri");
  if (name !== undefined && typeof name !== "string") throw new Error("Invalid name");
  if (location !== undefined && typeof location !== "string") throw new Error("Invalid location");
  if (typeof created !== "string" || created.length === 0) throw new Error("Invalid created");
  if (typeof updated !== "string" || updated.length === 0) throw new Error("Invalid updated");
  return { uri, name, location, created, updated };
}

export class FileVolunteerStore implements VolunteerStore {
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

  async create(input: CreateVolunteerParams) {
    const now = new Date().toISOString();
    const volunteer = normalizeVolunteer({
      uri: input.uri,
      name: input.name,
      location: input.location,
      created: now,
      updated: now,
    });
    const filePath = this._path(volunteer.uri);
    try {
      await fs.access(filePath);
      throw new Error("uri already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, volunteer);
        return volunteer;
      }
      throw err;
    }
  }

  async read(id: string) {
    const raw = await readJsonFile(this._path(id));
    if (!raw) return undefined;
    return normalizeVolunteer(raw);
  }

  async update(volunteer: UpdateVolunteerParams) {
    const existing = await this.read(volunteer.uri);
    if (!existing) throw new Error("NotFound");
    const merged = normalizeVolunteer({
      ...existing,
      ...volunteer,
      uri: volunteer.uri,
      created: existing.created,
      updated: new Date().toISOString(),
    });
    await writeJsonAtomic(this._path(merged.uri), merged);
    return merged;
  }

  async delete(id: string) {
    try {
      await fs.unlink(this._path(id));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return;
      throw err;
    }
  }

  async list() {
    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return [];
      throw err;
    }
    const out: ReturnType<typeof normalizeVolunteer>[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(normalizeVolunteer(raw));
      } catch {
        // skip invalid
      }
    }
    return out;
  }

  async updates(since: SinceQuery): Promise<UpdateResult<Volunteer>> {
    const all = await this.list();
    const cursor = typeof since?.since === "string" ? since.since : "";
    const updates = cursor ? all.filter((v) => v.updated > cursor) : all;
    return {
      updates,
      deletes: [],
      since: new Date().toISOString(),
    };
  }

  async snapshot(_query: AnyQuery): Promise<SnapshotResult> {
    const all = await this.list();
    return {
      uris: all.map((v) => v.uri),
      batchSize: 100,
    };
  }

  async batchRead(batch: BatchRead): Promise<BatchReadResult<Volunteer>> {
    const uris = Array.isArray(batch?.uris) ? batch.uris : [];
    const records: Volunteer[] = [];
    for (const uri of uris) {
      if (typeof uri !== "string") continue;
      const v = await this.read(uri);
      if (v) records.push(v);
    }
    return { records };
  }
}
