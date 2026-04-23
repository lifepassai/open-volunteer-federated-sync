import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveVolunteerStore } from "./stores/volunteer-store/index.js";

// Webapp API
import { createLoginRouter } from "./routers/webapp-api/login.js";
import { createAccountsRouter } from "./routers/webapp-api/account.js";
import { createDatasetSubscribersRouter } from "./routers/webapp-api/dataset-subscribers.js";
import { createDatasetSourcesRouter } from "./routers/webapp-api/dataset-sources.js";
import { createSyncTriggersRouter } from "./routers/webapp-api/sync/triggers.js";

// Sync API
import { createVolunteerDatasetSyncRouter } from "./routers/sync-api/dataset.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const volunteerStore = resolveVolunteerStore();

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Webapp API
  app.use("/api", createLoginRouter());
  app.use("/api/accounts", createAccountsRouter());
  app.use("/api/dataset-subscribers", createDatasetSubscribersRouter());
  app.use("/api/dataset-sources", createDatasetSourcesRouter());
  app.use("/api/sync/triggers", createSyncTriggersRouter("volunteer", volunteerStore));

  // Sync API
  app.use("/api/datasets/volunteers", createVolunteerDatasetSyncRouter());


  const publicDir = path.join(__dirname, "..", "public");
  if (fs.existsSync(publicDir)) {
    app.use(
      express.static(publicDir, {
        maxAge: asNumber(process.env.STATIC_MAX_AGE_SECONDS, 60) * 1000,
        index: false,
      }),
    );

    const indexHtml = path.join(publicDir, "index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      if (!fs.existsSync(indexHtml)) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[express]", err);
    const message =
      err && typeof err === "object" && err !== null && "message" in err && typeof (err as Error).message === "string"
        ? (err as Error).message
        : "InternalError";
    res.status(500).json({ error: "InternalError", message });
  });

  return app;
}
