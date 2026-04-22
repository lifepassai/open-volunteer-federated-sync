import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";
import { defaultStoreDir, readJsonFile, writeJsonAtomic } from "../../utils/file.js";

function idToFilename(id: string) {
  return `${encodeURIComponent(id)}.json`;
}

function normalizeOrganization(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid organization");
  const { id, name } = input as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0) throw new Error("Invalid id");
  if (typeof name !== "string" || name.length === 0) throw new Error("Invalid name");
  return { id, name };
}

export class FileOrganizationStore {
  dataDir: string;

  constructor({ dir }: { dir?: string } = {}) {
    this.dataDir = dir && dir.length > 0 ? dir : defaultStoreDir("organizations");
  }

  _path(id: string) {
    return path.join(this.dataDir, idToFilename(id));
  }

  async create(input: { id?: string; name: string }) {
    const id = input.id || nodeCrypto.randomUUID();
    const org = normalizeOrganization({ id, name: input.name });
    const filePath = this._path(org.id);
    try {
      await fs.access(filePath);
      throw new Error("id already exists");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        await writeJsonAtomic(filePath, org);
        return org;
      }
      throw err;
    }
  }

  async read(id: string) {
    const raw = await readJsonFile(this._path(id));
    if (!raw) return undefined;
    return normalizeOrganization(raw);
  }

  async update(organization: { id: string; name: string }) {
    const existing = await this.read(organization.id);
    if (!existing) throw new Error("NotFound");
    const merged = normalizeOrganization({ ...existing, ...organization, id: organization.id });
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
    const out: ReturnType<typeof normalizeOrganization>[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readJsonFile(path.join(this.dataDir, name));
      if (!raw) continue;
      try {
        out.push(normalizeOrganization(raw));
      } catch {
        // skip invalid
      }
    }
    return out;
  }
}
