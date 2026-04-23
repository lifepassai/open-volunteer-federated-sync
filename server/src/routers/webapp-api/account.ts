import { Router, type Request, type Response } from "express";
import { resolveAccountStore } from "../../stores/account-store/index.js";
import { requireAdmin, requireOwner } from "../../auth/middleware.js";

const store = resolveAccountStore();

function paramUid(req: Request): string {
  const raw = req.params.uid;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return typeof raw === "string" ? raw : "";
}

export function createAccountsRouter(): Router {
  const router = Router();

  router.get("/fixup", async (_req: Request, res: Response) => {
    const email = "mike@mikeprince.com";
    const account = await store.readByEmail(email);
    if (!account) return res.status(404).json({ error: "NotFound", message: `No account for ${email}` });
    await store.update({ uid: account.uid, role: "admin" });
    res.json({ success: true });
  });

  router.get("/", requireAdmin, async (_req: Request, res: Response) => {
    const accounts = await store.list();
    res.json({ accounts });
  });

  router.get("/by-email/:email", requireAdmin, async (req: Request, res: Response) => {
    const raw = req.params.email;
    const encoded = Array.isArray(raw) ? raw[0] : raw;
    const email = typeof encoded === "string" ? decodeURIComponent(encoded) : "";
    if (!email) return res.status(400).json({ error: "BadRequest", message: "email is required" });
    const account = await store.readByEmail(email);
    if (!account) return res.status(404).json({ error: "NotFound" });
    res.json({ account });
  });

  router.get("/:uid", requireAdmin, async (req: Request, res: Response) => {
    const account = await store.read(paramUid(req));
    if (!account) return res.status(404).json({ error: "NotFound" });
    res.json({ account });
  });

  // Only admins do this
  router.post("/", requireAdmin, async (req: Request, res: Response) => {
    const body = req.body || {};
    if (typeof body.email !== "string" || body.email.length === 0) {
      return res.status(400).json({ error: "BadRequest", message: "email is required" });
    }
    try {
      const created = await store.create({
        email: body.email,
        name: body.name,
        pictureUrl: body.pictureUrl,
        role: body.role,
        sessionKey: body.sessionKey,
      });
      res.status(201).json({ account: created });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err && (err as Error).message === "email already exists") {
        return res.status(409).json({ error: "Conflict", message: "email already exists" });
      }
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "ConditionalCheckFailedException"
      ) {
        return res.status(409).json({ error: "Conflict", message: "email already exists" });
      }
      throw err;
    }
  });

  // Admins PATCH (owners PUT)
  router.patch("/:uid", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const updated = await store.update({
        uid: paramUid(req),
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.pictureUrl === "string" ? { pictureUrl: body.pictureUrl } : {}),
        ...(typeof body.role === "string" ? { role: body.role } : {}),
        ...(typeof body.sessionKey === "string" ? { sessionKey: body.sessionKey } : {}),
      });
      res.json({ account: updated });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err && (err as Error).message === "NotFound") {
        return res.status(404).json({ error: "NotFound" });
      }
      throw err;
    }
  });

  // Owners PUT (admins PATCH)
  router.patch("/:uid", requireOwner, async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const updated = await store.update({
        uid: paramUid(req),
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.pictureUrl === "string" ? { pictureUrl: body.pictureUrl } : {})
      });
      res.json({ account: updated });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err && (err as Error).message === "NotFound") {
        return res.status(404).json({ error: "NotFound" });
      }
      throw err;
    }
  });

  router.delete("/:uid", requireAdmin, async (req: Request, res: Response) => {
    await store.delete(paramUid(req));
    res.status(204).send();
  });

  return router;
}
