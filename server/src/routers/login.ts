import { Router } from "express";
import type { Account } from "../stores/account-store/types.js";
import type { Request, Response } from "express";
import { verifyGoogleIdToken } from "../auth/google.js";
import { randomBase64url } from "../utils/misc.js";
import { resolveAccountStore } from "../stores/account-store/index.js";

const store = resolveAccountStore();

/**
 * Mount at app root: `POST /google-login` verifies Google ID tokens and upserts the account.
 */
export function createLoginRouter(): Router {
  const router = Router();

  router.post("/google-login", async (req: Request, res: Response) => {
    try {
      const idToken = (req.body as { idToken?: unknown })?.idToken;
      if (typeof idToken !== "string" || idToken.length === 0) {
        return res.status(400).json({ error: "BadRequest", message: "idToken is required" });
      }

      const { email, name, picture: pictureUrl } = await verifyGoogleIdToken(idToken);
      const existing = await store.readByEmail(email);

      if (existing) {
        const sessionKey = existing.sessionKey && existing.sessionKey.length > 0 ? existing.sessionKey : randomBase64url();
        await store.update({
          uid: existing.uid,
          name,
          pictureUrl,
          sessionKey,
        });
        const login = asLogin({ ...existing, name, pictureUrl, sessionKey });
        res.json({ login });
      } else {
        const account = await store.create({
          email,
          name,
          pictureUrl,
          sessionKey: randomBase64url()
        });
        const login = asLogin(account);
        res.json({ login });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      const isMisconfigured =
        message === "GOOGLE_CLIENT_ID is not configured" ||
        message === "Invalid token payload" ||
        message === "Token missing email claim";
      if (isMisconfigured) {
        console.error("[google-login] server misconfiguration:", message);
        return res.status(500).json({ error: "ServerMisconfigured", message });
      }
      console.warn("[google-login] rejected:", message);
      return res.status(401).json({ error: "Unauthorized", message });
    }
  });

  return router;
}

function asLogin(account: Account) {
  const { sessionKey, ...etc} = account;
  return { ...etc, bearerToken: `${account.uid}:${sessionKey}`};
}
