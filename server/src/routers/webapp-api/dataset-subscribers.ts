import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { resolveDatasetSubscribersStore } from "../../stores/dataset-subscribers-store/index.js";
import type { DatasetType } from "../../stores/types/sync.js";

function isServerMisconfiguredAuthError(message: string) {
  return (
    message === "GOOGLE_CLIENT_ID is not configured" ||
    message === "Invalid token payload" ||
    message === "Token missing email claim"
  );
}

function asSubscriberType(value: unknown): DatasetType | undefined {
  if (value === "volunteer" || value === "organization" || value === "opportunity") return value;
  return undefined;
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

export function createDatasetSubscribersRouter(): Router {
  const resolvedStore = resolveDatasetSubscribersStore();
  const router = Router();

  router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
      //const account = req.user;
      const type = asSubscriberType(req.query.type);
      if (req.query.type !== undefined && !type) {
        return res.status(400).json({ error: "BadRequest", message: "type must be volunteer|organization|opportunity" });
      }
      const all = await resolvedStore.list();
      const out = all.filter((s) => (!type || s.type === type));
      res.json(out);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-subscribers] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.user!;
      const type = asSubscriberType((req.body as { type?: unknown })?.type);
      if (!type) {
        return res.status(400).json({ error: "BadRequest", message: "type is required" });
      }

      const name = readOptionalString(req.body, "name");
      const description = readOptionalString(req.body, "description");
      const apiKey = readOptionalString(req.body, "apiKey");
      const disabled = readOptionalBoolean(req.body, "disabled");

      const created = new Date().toISOString();
      const record = await resolvedStore.create({
        uid,
        type,
        name,
        description,
        apiKey,
        disabled,
        created,
      });
      res.status(201).json(record);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-subscribers] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : message === "subscriber already exists" ? 409 : 401;
      const error =
        status === 409 ? "Conflict" : status === 401 ? "Unauthorized" : "BadRequest";
      res.status(status).json({ error, message });
    }
  });

  router.patch("/:type", requireAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.user!;
      const type = asSubscriberType(req.params.type);
      if (!type) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid type" });
      }

      const name = readOptionalString(req.body, "name");
      const description = readOptionalString(req.body, "description");
      const apiKey = readOptionalString(req.body, "apiKey");
      const disabled = readOptionalBoolean(req.body, "disabled");

      await resolvedStore.update({
        uid,
        type,
        name,
        description,
        apiKey,
        disabled,
      });
      const updated = await resolvedStore.read(uid, type);
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-subscribers] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message === "NotFound" ? 404 : message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : status === 404 ? "NotFound" : "BadRequest", message });
    }
  });

  router.delete("/:type", requireAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.user!;
      const type = asSubscriberType(req.params.type);
      if (!type) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid type" });
      }
      await resolvedStore.delete(uid, type);
      res.status(204).end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-subscribers] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  return router;
}
