import { Router } from "express";
import type { Request, Response } from "express";
import type { CrudStore } from "../../stores/types/crud.js";
import { requireAuth, requireAdmin } from "../../auth/middleware.js";
import { firstParams } from "../../utils/misc.js";
import { resolveVolunteerStore } from "../../stores/volunteer-store/index.js";
import type { Volunteer, CreateVolunteerParams, UpdateVolunteerParams } from "../../stores/volunteer-store/types.js";
import type { URI } from "../../stores/types/sync.js";

function isServerMisconfiguredAuthError(message: string) {
  return (
    message === "GOOGLE_CLIENT_ID is not configured" ||
    message === "Invalid token payload" ||
    message === "Token missing email claim"
  );
}

function asErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export type DatasetCrudRouterOptions<Key> = {
  /** Convert a URL param string into the store key type. */
  parseKey?: (raw: string) => Key;
};

export function createDatasetCrudRouter<Key, T, CreateParams, UpdateParams>(
  store: CrudStore<Key, T, CreateParams, UpdateParams>,
  opts: DatasetCrudRouterOptions<Key> = {},
): Router {
  const router = Router();
  const parseKey = opts.parseKey ?? ((raw: string) => decodeURIComponent(raw) as unknown as Key);

  // List
  router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const result = await store.list(cursor);
      res.json(result);
    } catch (err: unknown) {
      const message = asErrorMessage(err, "Unauthorized");
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-crud] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  // Create
  router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const created = await store.create(req.body as CreateParams);
      res.status(201).json(created);
    } catch (err: unknown) {
      const message = asErrorMessage(err, "Unauthorized");
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-crud] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status =
        message === "uri already exists" || message.endsWith(" already exists")
          ? 409
          : message.startsWith("BadRequest")
            ? 400
            : 401;
      const error = status === 409 ? "Conflict" : status === 401 ? "Unauthorized" : "BadRequest";
      res.status(status).json({ error, message });
    }
  });

  // Read
  router.get("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = firstParams(req);
      const key = parseKey(id);
      const record = await store.read(key);
      if (!record) return res.status(404).json({ error: "NotFound", message: "NotFound" });
      res.json(record);
    } catch (err: unknown) {
      const message = asErrorMessage(err, "Unauthorized");
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-crud] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  // Update (partial update via PATCH; mirrors other webapp APIs)
  router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = firstParams(req);
      const key = parseKey(id);

      // Most dataset update payloads include the key (e.g. `uri`) so inject/override it.
      const payload = { ...(req.body as Record<string, unknown>), ...(typeof key === "string" ? { uri: key } : {}) };
      const updated = await store.update(payload as UpdateParams);
      res.json(updated);
    } catch (err: unknown) {
      const message = asErrorMessage(err, "Unauthorized");
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-crud] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message === "NotFound" ? 404 : message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : status === 404 ? "NotFound" : "BadRequest", message });
    }
  });

  // Delete
  router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = firstParams(req);
      const key = parseKey(id);
      await store.delete(key);
      res.status(204).end();
    } catch (err: unknown) {
      const message = asErrorMessage(err, "Unauthorized");
      if (isServerMisconfiguredAuthError(message)) {
        console.error("[dataset-crud] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      const status = message.startsWith("BadRequest") ? 400 : 401;
      res.status(status).json({ error: status === 401 ? "Unauthorized" : "BadRequest", message });
    }
  });

  return router;
}

export function createVolunteerDatasetCrudRouter(): Router {
  const store = resolveVolunteerStore();
  return createDatasetCrudRouter<URI, Volunteer, CreateVolunteerParams, UpdateVolunteerParams>(store, {
    parseKey: (raw) => decodeURIComponent(raw) as URI,
  });
}
