import { Router } from "express";
import type { Request, Response } from "express";
import type { SyncronizingStore, AnyQuery, SyncRecord, DatasetUpdates } from "../../../stores/types/sync.js";
import { resolveVolunteerStore } from "../../../stores/volunteer-store/index.js";
import { resolveDatasetSourceStore } from "../../../stores/dataset-sources-store/index.js";
import { DatasetType } from "../../../stores/types/sync.js";
import { requireAdmin } from "../../../auth/middleware.js";
import { firstParams, fullJson } from "../../../utils/misc.js";

const datasetSourceStore = resolveDatasetSourceStore();

const UNIX_EPOCH = new Date(0).toISOString();

export function createSyncTriggersRouter<T extends SyncRecord>(type: DatasetType, store: SyncronizingStore<T>): Router {
    const router = Router();
  
    // trigger an "update" PULL using a dataset source
    // Only an admin can trigger this operation
    router.get("/trigger-update", requireAdmin, async (req: Request, res: Response) => {

        // Get the datasource(s) for this dataset
        const sources = await datasetSourceStore.listByType(type);
        if (!sources.length)
            return res.json({ message: `No dataset sources for type ${type}` });

        const source = sources[0];

        let since: string = firstParams(req).since || source.lastUpdateSync || UNIX_EPOCH;
        const url = new URL("updates",source.baseUrl);
        url.searchParams.set("since", since);

        const fetchResult = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `ApiKey ${source.apiKey}`,
            },
        });
        if(!fetchResult.ok)
            return res.status(fetchResult.status).json({ error: "FailedToFetch", message: `Failed to fetch updates from ${url}` });

        const updates = await fetchResult.json() as DatasetUpdates<T>;
        console.log( "updates", fullJson(updates) );

        const result = await store.updates( updates );
        res.json(result);
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
