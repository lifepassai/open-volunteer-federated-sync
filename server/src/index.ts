import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = createApp();
const rawPort = process.env.PORT;
const port =
  rawPort !== undefined && rawPort !== "" ? Number(rawPort) : 3001;
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`[server] Invalid PORT: ${JSON.stringify(rawPort)}`);
  process.exit(1);
}

const server = http.createServer(app);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${port} is already in use (another process is listening). Stop it or pick a free port, e.g. PORT=3002 pnpm dev`,
    );
  } else {
    console.error("[server] HTTP server error:", err);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`REST server listening on http://localhost:${port}`);
});
