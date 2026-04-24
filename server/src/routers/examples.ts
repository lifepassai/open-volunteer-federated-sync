import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";

export function createExamplesRouter(opts: { publicDir: string }): Router {
  const router = Router();
  const examplesDir = path.join(opts.publicDir, "examples");

  // Convenience route: allow `/examples/.../full` (no extension) to serve `full.json`.
  // Express 5 (path-to-regexp v8) doesn't accept bare `/*`; name the wildcard param.
  router.get("/*splat", (req: Request, res: Response, next: NextFunction) => {
    try {
      // Preserve existing explicit `.json` paths.
      const urlPath = req.path; // e.g. "/volunteer/full"
      const mappedPath = urlPath.endsWith(".json") ? urlPath : `${urlPath}.json`;

      // Prevent traversal: resolve within examplesDir.
      const abs = path.resolve(examplesDir, mappedPath.replace(/^\//, ""));
      if (!abs.startsWith(examplesDir + path.sep)) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid path" });
      }
      if (!fs.existsSync(abs)) return next();

      res.type("application/json");
      res.sendFile(abs);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

