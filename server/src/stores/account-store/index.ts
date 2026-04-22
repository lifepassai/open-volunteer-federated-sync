import type { AccountStore } from "./types.js";
import { FileAccountStore } from "./file.js";
import { DynamoAccountStore } from "./dynamodb.js";

let cached: AccountStore | undefined;

export function resolveAccountStore(): AccountStore {
  if (cached) return cached;

  const backend = (process.env.STORAGE_BACKEND || "file").toLowerCase();

  if (backend === "dynamodb") {
    const tableName = process.env.ACCOUNTS_TABLE_NAME;
    if (!tableName) throw new Error("ACCOUNTS_TABLE_NAME is required when STORAGE_BACKEND=dynamodb");
    cached = new DynamoAccountStore({
      tableName,
      region: process.env.AWS_REGION,
      uidIndexName: process.env.ACCOUNTS_UID_INDEX_NAME,
    });
    return cached!;
  }

  cached = new FileAccountStore();
  return cached!;
}
