import type { OpportunityStore } from "./types.js";
import { FileOpportunityStore } from "./file.js";

let cached: OpportunityStore | undefined;

export function resolveOpportunityStore(): OpportunityStore {
  if (cached) return cached;

  const backend = (
    process.env.OPPORTUNITY_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Opportunity store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileOpportunityStore({
    dataFile:
      process.env.OPPORTUNITY_DATA_FILE ||
      (process.env.DATA_DIR ? `${process.env.DATA_DIR}/opportunities.json` : "./data/opportunities.json"),
  });
  return cached;
}
