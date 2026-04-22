import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

function idToFilename(id: string) {
  return `${encodeURIComponent(id)}.json`;
}

function normalizeOpportunity(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid opportunity");
  const o = input as Record<string, unknown>;
  const id = o.id;
  const title = o.title;
  const description = o.description;
  const location = o.location;
  const organizationId = o.organizationId;
  const applyUrl = o.applyUrl;
  const startDate = o.startDate;
  const endDate = o.endDate;
  const created = o.created;
  const updated = o.updated;
  if (typeof id !== "string" || id.length === 0) throw new Error("Invalid id");
  if (typeof title !== "string" || title.length === 0) throw new Error("Invalid title");
  if (typeof description !== "string") throw new Error("Invalid description");
  if (typeof location !== "string") throw new Error("Invalid location");
  if (typeof organizationId !== "string") throw new Error("Invalid organizationId");
  if (typeof applyUrl !== "string") throw new Error("Invalid applyUrl");
  if (typeof startDate !== "string") throw new Error("Invalid startDate");
  if (typeof endDate !== "string") throw new Error("Invalid endDate");
  if (typeof created !== "string" || created.length === 0) throw new Error("Invalid created");
  if (typeof updated !== "string" || updated.length === 0) throw new Error("Invalid updated");
  return {
    id,
    title,
    description,
    location,
    organizationId,
    applyUrl,
    startDate,
    endDate,
    created,
    updated,
  };
}

export class FileOpportunityStore {
  dataDir: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("opportunities");
  }

  _path(id: string) {
    return path.join(this.dataDir, idToFilename(id));
  }

  async create(input: {
    id?: string;
    title: string;
    description: string;
    location: string;
    organizationId: string;
    applyUrl: string;
    startDate: string;
    endDate: string;
    created?: string;
    updated?: string;
  }) {
    const now = new Date().toISOString();
    const id = input.id || nodeCrypto.randomUUID();
    const opp = normalizeOpportunity({
      ...input,
      id,
      created: input.created || now,
      updated: input.updated || now,
    });
    const filePath = this._path(opp.id);
    try {
      await fs.access(filePath);
      throw new Error("id already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, opp);
        return opp;
      }
      throw err;
    }
  }

  async read(id: string) {
    const raw = await readJsonFile(this._path(id));
    if (!raw) return undefined;
    return normalizeOpportunity(raw);
  }

  async update(opportunity: {
    id: string;
    title: string;
    description: string;
    location: string;
    organizationId: string;
    applyUrl: string;
    startDate: string;
    endDate: string;
    created: string;
    updated: string;
  }) {
    const existing = await this.read(opportunity.id);
    if (!existing) throw new Error("NotFound");
    const merged = normalizeOpportunity({
      ...existing,
      ...opportunity,
      id: opportunity.id,
      created: existing.created,
      updated: opportunity.updated || new Date().toISOString(),
    });
    await writeJsonAtomic(this._path(merged.id), merged);
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
    const out: ReturnType<typeof normalizeOpportunity>[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(normalizeOpportunity(raw));
      } catch {
        // skip invalid
      }
    }
    return out;
  }
}
