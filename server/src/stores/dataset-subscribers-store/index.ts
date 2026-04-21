import type { DatasetSubscribersStore } from "./types.js";
import { FileDatasetSubscribersStore } from "./file.js";

let cached: DatasetSubscribersStore | undefined;

export function resolveDatasetSubscribersStore(): DatasetSubscribersStore {
  if (cached) return cached;

  const backend = (
    process.env.DATASET_SUBSCRIBERS_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Dataset subscribers store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileDatasetSubscribersStore({
    dataFile:
      process.env.DATASET_SUBSCRIBERS_DATA_FILE ||
      (process.env.DATA_DIR ? `${process.env.DATA_DIR}/dataset-subscribers.json` : "./data/dataset-subscribers.json"),
  });

  return cached!;
}

