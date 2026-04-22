import type { OrganizationStore } from "./types.js";
import { FileOrganizationStore } from "./file.js";

let cached: OrganizationStore | undefined;

export function resolveOrganizationStore(): OrganizationStore {
  if (cached) return cached;

  const backend = (
    process.env.ORGANIZATION_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Organization store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileOrganizationStore();
  return cached;
}
