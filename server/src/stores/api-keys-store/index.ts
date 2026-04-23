import type { ApiKeysStore } from "./types.js";
import { FileApiKeysStore } from "./file.js";

let cached: ApiKeysStore | undefined;

export function resolveApiKeysStore(): ApiKeysStore {
  if (cached) return cached;

  const backend = (
    process.env.API_KEYS_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Api keys store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileApiKeysStore();
  return cached;
}
