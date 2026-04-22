import type { VolunteerStore } from "./types.js";
import { FileVolunteerStore } from "./file.js";

let cached: VolunteerStore | undefined;

export function resolveVolunteerStore(): VolunteerStore {
  if (cached) return cached;

  const backend = (
    process.env.VOLUNTEER_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Volunteer store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileVolunteerStore();
  return cached!;
}
