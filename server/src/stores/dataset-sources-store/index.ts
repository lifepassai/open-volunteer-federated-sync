import type { DatasetSourceStore } from "./types.js";
import { FileDatasetSourceStore } from "./file.js";

let cached: DatasetSourceStore | undefined;

export function resolveDatasetSourceStore(): DatasetSourceStore {
  if (cached) return cached;

  const backend = (
    process.env.DATASET_SOURCES_STORAGE_BACKEND ||
    process.env.STORAGE_BACKEND ||
    "file"
  ).toLowerCase();

  if (backend !== "file") {
    throw new Error(`Dataset sources store: unsupported backend "${backend}" (file is the default)`);
  }

  cached = new FileDatasetSourceStore({
    dataFile:
      process.env.DATASET_SOURCES_DATA_FILE ||
      (process.env.DATA_DIR ? `${process.env.DATA_DIR}/dataset-sources.json` : "./data/dataset-sources.json"),
  });

  return cached!;
}
