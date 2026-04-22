import path from "node:path";
import * as fs from "node:fs/promises";
import crypto from "node:crypto";

/**
 * Resolve the base data directory used by file-backed stores.
 *
 * - If `DATA_DIR` is set, use it (caller may point it anywhere).
 * - Otherwise, default to `./.data` under the current working directory.
 */
export function resolveDataDir(): string {
  return process.env.DATA_DIR ? process.env.DATA_DIR : path.join(process.cwd(), ".data");
}

/** Default directory for a given store, under the base data dir. */
export function defaultStoreDir(storeName: string): string {
  return path.join(resolveDataDir(), storeName);
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT")
      return null;
    throw err;
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = `${filePath}.tmp.${crypto.randomUUID()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

