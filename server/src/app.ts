import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveVolunteerStore } from "./stores/volunteer-store/index.js";
import { resolveDatasetSubscribersStore } from "./stores/dataset-subscribers-store/index.js";
import { createAccountsRouter } from "./routers/account.js";
import { createLoginRouter } from "./routers/login.js";
import { createDatasetRouter } from "./routers/dataset.js";
import { createDatasetSubscribersRouter } from "./routers/dataset-subscribers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use(createLoginRouter());
  app.use("/api/accounts", createAccountsRouter());

  // Our managed datasets
  const volunteerStore = resolveVolunteerStore();
  app.use("/api/datasets/volunteers", createDatasetRouter(volunteerStore));

  const datasetSubscribersStore = resolveDatasetSubscribersStore();
  app.use("/api/dataset-subscribers", createDatasetSubscribersRouter(datasetSubscribersStore));

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
