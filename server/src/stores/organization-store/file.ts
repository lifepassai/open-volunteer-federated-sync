import * as fs from "node:fs/promises";
import path from "node:path";
import nodeCrypto from "node:crypto";

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

  constructor({ dataFile }: { dataFile: string }) {
    if (!dataFile) throw new Error("dataFile is required");
    const ext = path.extname(dataFile);
    const baseWithoutExt = ext ? path.basename(dataFile, ext) : path.basename(dataFile);
    this.dataDir = path.join(path.dirname(dataFile), baseWithoutExt);
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
