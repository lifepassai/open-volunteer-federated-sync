import type { Account, CreateAccount, KeylessAccount } from "./types.js";

export function normalizeAccount(input: unknown): Account {
  if (!input || typeof input !== "object") throw new Error("Invalid account");
  const { uid, email, name, pictureUrl, role, sessionKey } = input as Record<string, unknown>;
  if (typeof uid !== "string" || uid.length === 0) throw new Error("Invalid uid");
  if (typeof email !== "string" || email.length === 0) throw new Error("Invalid email");
  return {
    uid,
    email,
    ...(typeof name === "string" ? { name } : {}),
    ...(typeof pictureUrl === "string" ? { pictureUrl } : {}),
    ...(typeof role === "string" ? { role } : {}),
    ...(typeof sessionKey === "string" ? { sessionKey } : {}),
  };
}

export function toKeylessAccount(a: Account): KeylessAccount {
  const { sessionKey: _s, ...rest } = a;
  return rest;
}

export function accountFromCreate(uid: string, input: CreateAccount): Account {
  return {
    uid,
    email: input.email,
    ...(typeof input.name === "string" ? { name: input.name } : {}),
    ...(typeof input.pictureUrl === "string" ? { pictureUrl: input.pictureUrl } : {}),
    ...(typeof input.role === "string" ? { role: input.role } : {}),
    ...(typeof input.sessionKey === "string" ? { sessionKey: input.sessionKey } : {}),
  };
}
