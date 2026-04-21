import { createRequire } from "node:module";
import { createApp } from "./app.js";

const require = createRequire(import.meta.url);
const configure = require("@vendia/serverless-express") as (opts: { app: ReturnType<typeof createApp> }) => unknown;

export const handler = configure({ app: createApp() });
