import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import type { Account, AccountStore, AccountUpdate, CreateAccount, KeylessAccount } from "./types.js";
import { accountFromCreate, normalizeAccount, toKeylessAccount } from "./normalize.js";

const COUNTER_EMAIL = "__counter__";

/**
 * DynamoDB: partition key `email` (string). GSI `UidIndex` (name from ACCOUNTS_UID_INDEX_NAME, default `UidIndex`)
 * with partition key `uid` for lookups. Reserved row `email === "__counter__"` holds sequential uid in `seq` via ADD.
 */
export class DynamoAccountStore implements AccountStore {
  tableName: string;
  ddb: ReturnType<typeof DynamoDBDocumentClient.from>;
  private uidIndexName: string;

  constructor({
    tableName,
    region,
    uidIndexName,
  }: {
    tableName: string;
    region?: string;
    uidIndexName?: string;
  }) {
    if (!tableName) throw new Error("ACCOUNTS_TABLE_NAME is required");
    this.tableName = tableName;
    this.uidIndexName = uidIndexName || process.env.ACCOUNTS_UID_INDEX_NAME || "UidIndex";
    const client = new DynamoDBClient(region ? { region } : {});
    this.ddb = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  private async nextSequentialUid(): Promise<string> {
    const out = await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { email: COUNTER_EMAIL },
        UpdateExpression: "ADD #s :one",
        ExpressionAttributeNames: { "#s": "seq" },
        ExpressionAttributeValues: { ":one": 1 },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    const seq = out.Attributes?.seq;
    if (typeof seq !== "number" || !Number.isFinite(seq)) {
      throw new Error("Failed to allocate sequential uid (counter)");
    }
    return String(seq);
  }

  async create(account: CreateAccount): Promise<Account> {
    if (typeof account.email !== "string" || account.email.length === 0) {
      throw new Error("email is required");
    }
    if (account.email === COUNTER_EMAIL) {
      throw new Error("reserved email");
    }

    const existing = await this.readByEmail(account.email);
    if (existing) throw new Error("email already exists");

    const uid = await this.nextSequentialUid();
    const item = accountFromCreate(uid, account);

    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(#e)",
        ExpressionAttributeNames: { "#e": "email" },
      }),
    );
    return item;
  }

  async read(uid: string): Promise<Account | undefined> {
    const out = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: this.uidIndexName,
        KeyConditionExpression: "#u = :u",
        ExpressionAttributeNames: { "#u": "uid" },
        ExpressionAttributeValues: { ":u": uid },
        Limit: 1,
      }),
    );
    const hit = out.Items?.[0];
    return hit ? normalizeAccount(hit) : undefined;
  }

  async readByEmail(email: string): Promise<Account | undefined> {
    if (email === COUNTER_EMAIL) return undefined;
    const out = await this.ddb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email },
      }),
    );
    const item = out.Item;
    if (!item) return undefined;
    if (typeof (item as { uid?: unknown }).uid !== "string") return undefined;
    return normalizeAccount(item);
  }

  async update(update: AccountUpdate): Promise<void> {
    if (typeof update.uid !== "string" || update.uid.length === 0) {
      throw new Error("uid is required");
    }
    const existing = await this.read(update.uid);
    if (!existing) throw new Error("NotFound");

    const merged = normalizeAccount({
      ...existing,
      ...update,
      uid: existing.uid,
      email: existing.email,
    });

    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: merged,
      }),
    );
  }

  async delete(uid: string): Promise<void> {
    const existing = await this.read(uid);
    if (!existing) return;
    await this.ddb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { email: existing.email },
      }),
    );
  }

  async list(): Promise<KeylessAccount[]> {
    const out = await this.ddb.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "attribute_exists(#u) AND #e <> :c",
        ExpressionAttributeNames: { "#u": "uid", "#e": "email" },
        ExpressionAttributeValues: { ":c": COUNTER_EMAIL },
      }),
    );
    const items = out.Items || [];
    return items.map((item: unknown) => toKeylessAccount(normalizeAccount(item)));
  }
}
