import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response, RequestHandler } from "express";
import type { Account } from "../stores/account-store/types.js";
import { resolveAccountStore } from "../stores/account-store/index.js";

const store = resolveAccountStore();

declare global {
  namespace Express {
    interface Request {
      user?: Account;
    }
  }
}

/**
 * Parse `Authorization: Bearer <token>` where token is `uid:sessionKey`.
 * Only the first colon separates uid from sessionKey (sessionKey may contain colons).
 */
export function parseBearerUidSession(authorizationHeader: string | undefined): { uid: string; sessionKey: string } | null {
  if (!authorizationHeader) return null;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  if (!token)
    return null;

  const [uid, sessionKey] = token.split(":");
  return { uid, sessionKey };
}

function sessionKeysEqual(stored: string | undefined, provided: string): boolean {
  if (stored === undefined || stored.length === 0) return false;
  if (stored.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(stored, "utf8"), Buffer.from(provided, "utf8"));
}

/**
 * Express middleware: `Authorization: Bearer <uid>:<sessionKey>`, load account by uid, verify sessionKey.
 * On success sets `req.user` to the account and calls `next()`.
 * On failure responds with 401 JSON and does not set `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  void (async () => {
    try {
      const header = req.header("authorization") || req.header("Authorization");
      const parsed = parseBearerUidSession(header);
      if (!parsed) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Missing or invalid Authorization bearer token (expected uid:sessionKey)",
        });
        return;
      }

      const { uid, sessionKey } = parsed;
      const account = await store.read(uid);
      if (!account) {
        res.status(401).json({ error: "Unauthorized", message: "Unknown user" });
        return;
      }

      if (!sessionKeysEqual(account.sessionKey, sessionKey)) {
        res.status(401).json({ error: "Unauthorized", message: "Invalid session" });
        return;
      }

      req.user = account;
      next();
    } catch (err: unknown) {
      next(err);
    }
  })();
}

/**
 * Express middleware: requires authenticated admin user (`req.user.role === "admin"`).
 * If `req.user` is missing, respond 401. If role is not admin, respond 403.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin role required" });
      return;
    }
    next();
  });
}

/**
 * Express middleware: requires authenticated owner user (`req.user.uid === req.params.uid`).
 * If `req.user` is missing, respond 401. If uid is not owner, respond 403.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
      return;
    }
    if (user.uid !== req.params.uid) {
      res.status(403).json({ error: "Forbidden", message: "Owner required" });
      return;
    }
    next();
  });
}

export type AuthenticatedRequest = Parameters<RequestHandler>[0] & { user: Account };
