import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../auth/middleware.js";
import type { DatasetSource } from "../stores/dataset-sources-store/types.js";
import { resolveDatasetSourceStore } from "../stores/dataset-sources-store/index.js";
import type { DatasetType } from "../stores/types.js";

function isServerMisconfiguredAuthError(message: string) {
  return (
    message === "GOOGLE_CLIENT_ID is not configured" ||
    message === "Invalid token payload" ||
    message === "Token missing email claim"
  );
}


function asSourceType(value: unknown): DatasetType | undefined {
  if (value === "volunteer" || value === "organization" || value === "opportunity") return value;
  return undefined;
}

function readRequiredString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") throw new Error(`BadRequest: ${key} is required`);
  const v = (body as Record<string, unknown>)[key];
  if (typeof v !== "string" || v.length === 0) throw new Error(`BadRequest: ${key} is required`);
  return v;
}

function readOptionalString(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const v = (body as Record<string, unknown>)[key];
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new Error(`BadRequest: ${key} must be a string`);
  return v;
}

function readOptionalBoolean(body: unknown, key: string): boolean | undefined {
  if (!body || typeof body !== "object") return undefined;
  const v = (body as Record<string, unknown>)[key];
  if (v === undefined) return undefined;
  if (typeof v !== "boolean") throw new Error(`BadRequest: ${key} must be a boolean`);
  return v;
}

export function createDatasetSourcesRouter(): Router {
  const store = resolveDatasetSourceStore();
  const router = Router();

  function paramUri(req: Request): string {
    const raw = req.params.uri;
    const encoded = Array.isArray(raw) ? raw[0] : raw;
    return typeof encoded === "string" ? decodeURIComponent(encoded) : "";
  }

  router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const type = asSourceType(req.query.type);
      if (req.query.type !== undefined && !type) {
        return res.status(400).json({ error: "BadRequest", message: "type must be volunteer|organization|opportunity" });
      }
      const all = await store.list();
      const out = all.filter((s) => (!type || s.type === type));
      res.json(out);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-sources] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const uri = readRequiredString(req.body, "uri");
      const type = asSourceType((req.body as { type?: unknown })?.type);
      if (!type) return res.status(400).json({ error: "BadRequest", message: "type is required" });

      const name = readOptionalString(req.body, "name");
      const description = readOptionalString(req.body, "description");
      const apiKey = readOptionalString(req.body, "apiKey");
      const disabled = readOptionalBoolean(req.body, "disabled");

      const created = new Date().toISOString();
      const record: DatasetSource = {
        uri,
        type,
        name,
        description,
        apiKey,
        disabled,
        created,
      };

      const out = await store.create(record);
      res.status(201).json(out);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-sources] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message === "uri already exists" ? 409 : message.startsWith("BadRequest") ? 400 : 401;
      const error = status === 409 ? "Conflict" : status === 401 ? "Unauthorized" : "BadRequest";
      res.status(status).json({ error, message });
    }
  });

  router.patch("/:uri", requireAuth, async (req: Request, res: Response) => {
    try {
      const uri = paramUri(req);
      if (!uri) return res.status(400).json({ error: "BadRequest", message: "Invalid uri" });

      const existing = await store.read(uri);
      if (!existing) return res.status(404).json({ error: "NotFound", message: "NotFound" });

      const type = asSourceType(readOptionalString(req.body, "type") ?? existing.type);
      if (!type) return res.status(400).json({ error: "BadRequest", message: "Invalid type" });

      const name = readOptionalString(req.body, "name");
      const description = readOptionalString(req.body, "description");
      const apiKey = readOptionalString(req.body, "apiKey");
      const disabled = readOptionalBoolean(req.body, "disabled");

      const updated = await store.update({
        ...existing,
        type,
        name,
        description,
        apiKey,
        disabled,
      });
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-sources] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message === "NotFound" ? 404 : message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : status === 404 ? "NotFound" : "BadRequest", message });
    }
  });

  router.delete("/:uri", requireAuth, async (req: Request, res: Response) => {
    try {
      const uri = paramUri(req);
      if (!uri) return res.status(400).json({ error: "BadRequest", message: "Invalid uri" });
      await store.delete(uri);
      res.status(204).end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-sources] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  return router;
}

