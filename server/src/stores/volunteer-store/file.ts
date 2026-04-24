import * as fs from "node:fs/promises";
import path from "node:path";

import type {
  AnyQuery,
  BatchRead,
  BatchReadResult,
  DatasetUpdateResult,
  DatasetUpdates,
  QueryUpdatesResult,
  SinceQuery,
  SnapshotResult,
} from "../types/sync.js";
import type { CreateVolunteerParams, UpdateVolunteerParams, Volunteer, VolunteerStore } from "./types.js";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

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

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("volunteers");
  }

  _path(uri: string) {
    return path.join(this.dataDir, uriToFilename(uri));
  }

  private async _listAllRecords(): Promise<Volunteer[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.dataDir);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
        return [];
      throw err;
    }
    const out: Volunteer[] = [];
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
    if (!raw) return null;
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

  // TODO: fix so we don't _listAllRecords() each time
  async list(_cursor?: string) {
    const pageSize = 10;
    const all = await this._listAllRecords();
    const sorted = all.sort((a, b) => a.uri.localeCompare(b.uri));

    const cursor = typeof _cursor === "string" && _cursor.length > 0 ? _cursor : undefined;
    const startIdx =
      cursor ? Math.max(0, sorted.findIndex((v) => v.uri === cursor) + 1) : 0;

    const records = sorted.slice(startIdx, startIdx + pageSize);
    const nextCursor = startIdx + pageSize < sorted.length ? records.at(-1)?.uri : undefined;

    return nextCursor ? { records, cursor: nextCursor } : { records };
  }

  async queryUpdates(query: SinceQuery): Promise<QueryUpdatesResult<Volunteer>> {
    const all = await this._listAllRecords();
    const since = typeof query?.since === "string" ? query.since : "";
    const updates = since ? all.filter((v) => v.updated > since) : all;
    return {
      updates,
      deleted: [],
    };
  }

  async snapshot(_query: AnyQuery): Promise<SnapshotResult> {
    const all = await this._listAllRecords();
    return {
      uris: all.map((v) => v.uri),
      batchSize: 100,
    };
  }

  async batchRead(batch: BatchRead): Promise<BatchReadResult<Volunteer>> {
    const uris = Array.isArray(batch?.uris) ? batch.uris : [];
    const records: Volunteer[] = [];
    const deleted: string[] = [];
    for (const uri of uris) {
      if (typeof uri !== "string") continue;
      const v = await this.read(uri);
      if (v) records.push(v);
      else deleted.push(uri);
    }
    return deleted.length > 0 ? { records, deleted } : { records };
  }

  async updates(input: DatasetUpdates<Volunteer>): Promise<DatasetUpdateResult> {
    const now = new Date().toISOString();
    const updated: string[] = [];
    const deleted: string[] = [];
    const ignored: string[] = [];

    const incomingUpdates = Array.isArray(input?.updates) ? input.updates : [];
    const incomingDeletes = Array.isArray(input?.deletes) ? input.deletes : [];

    for (const record of incomingUpdates) {
      try {
        const existing = typeof record?.uri === "string" ? await this.read(record.uri) : null;
        const normalized = normalizeVolunteer({
          ...(existing ?? {}),
          ...(record as Record<string, unknown>),
          created:
            (record as Record<string, unknown>)?.created ??
            existing?.created ??
            now,
          updated: now,
        });
        await writeJsonAtomic(this._path(normalized.uri), normalized);
        updated.push(normalized.uri);
      } catch {
        if (record && typeof record === "object" && "uri" in record && typeof (record as any).uri === "string") {
          ignored.push((record as any).uri);
        }
      }
    }

    for (const uri of incomingDeletes) {
      if (typeof uri !== "string" || uri.length === 0) continue;
      try {
        await this.delete(uri);
        deleted.push(uri);
      } catch {
        ignored.push(uri);
      }
    }

    return { updated, deleted, ignored };
  }
}
