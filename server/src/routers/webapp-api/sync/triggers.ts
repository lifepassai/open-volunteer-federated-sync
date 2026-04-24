import { Router } from "express";
import type { Request, Response } from "express";
import type { SyncronizingStore, AnyQuery, SyncRecord, DatasetUpdates, DatasetUpdateResult } from "../../../stores/types/sync.js";
import { resolveVolunteerStore } from "../../../stores/volunteer-store/index.js";
import { resolveDatasetSourceStore } from "../../../stores/dataset-sources-store/index.js";
import { DatasetType } from "../../../stores/types/sync.js";
import { requireAdmin } from "../../../auth/middleware.js";
import { firstParams } from "../../../utils/misc.js";
import { createSSEWriter, type SSEWriter } from "./sse.js";

const datasetSourceStore = resolveDatasetSourceStore();

const UNIX_EPOCH = new Date(0).toISOString();

function errorHttpStatus(err: unknown): number | undefined {
    if (!err || typeof err !== "object" || !("status" in err)) return undefined;
    const n = Number((err as { status?: unknown }).status);
    return Number.isFinite(n) ? n : undefined;
}

export type UpdateEvent = {
    event: "error" | "progress" | "update" | "result" ;
    message: string;
    data?: unknown;
};

export function createSyncTriggersRouter<T extends SyncRecord>(type: DatasetType, store: SyncronizingStore<T>): Router {
    const router = Router();

    // trigger an "update" PULL using a dataset source
    // Only an admin can trigger this operation
    router.get("/update/:id", requireAdmin, async (req: Request, res: Response) => {
        const { id } = firstParams(req);
        const sinceQuery = typeof req.query.since === "string" ? req.query.since : undefined;
        const sseWriter = createSSEWriter(req, res);

        try {
            const source = await datasetSourceStore.read(id);
            if (!source) {
                sseWriter.write({ event: "Error", data: `No dataset source for id ${id} (dataset type ${type})` }).end(400);
                return;
            }
            if( source.type !== type) {
                sseWriter.write({ event: "Error", data: `Dataset source ${source.name} is not a ${type} dataset` }).end(400);
                return;
            }

            const since: string = sinceQuery || source.lastUpdateSync || UNIX_EPOCH;
            if (!source.baseUrl) {
                sseWriter.write({ event: "Error", data: `Datasource ${source.name} has no baseUrl configured` }).end(400);
                return;
            }

            const url = new URL("updates", source.baseUrl);
            url.searchParams.set("since", since);
            sseWriter.write({ event: "Fetching updates", data: `Fetching updates from ${url.toString()}…` });

            const fetchResult = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Authorization: `ApiKey ${source.apiKey}`,
                },
            });
            if (!fetchResult.ok) {
                const msg = `Failed to fetch updates (${fetchResult.status})`;
                sseWriter.write({ event: "Error", data: msg }).end(500);
                return;
            }

            const updates = (await fetchResult.json()) as DatasetUpdates<T>;
            sseWriter.write({ event: "Updates fetched", data: updates });

            sseWriter.write({ event: "Applying updates", data: "Applying updates to local dataset…" });
            const result = await store.updates(updates);
            sseWriter.write({ event: "Updates applied", data: result });

            sseWriter.end(200);
        } catch (err: unknown) {
            sseWriter.write({ event: "Error", data: err instanceof Error ? err.message : String(err) }).end(500);
        }
    });

    // trigger a "snapshot" pull from the dataset
    router.get("/:uid/snapshot", async (req: Request, res: Response) => {
        const { uid } = req.params;
        const result = await store.snapshot(req.body as AnyQuery);
        res.json(result);
    });

    return router;
}

export function createVolunteerSyncTriggersDatasetRouter(): Router {
    const store = resolveVolunteerStore();
    return createSyncTriggersRouter("volunteer", store);
}
