import { Router } from "express";
import type { Request, Response } from "express";
import type { SyncronizingStore, AnyQuery, SinceQuery, BatchRead, SyncRecord, DatasetUpdates } from "../../stores/types/sync.js";
import { resolveVolunteerStore } from "../../stores/volunteer-store/index.js";
import { DatasetType } from "../../stores/types/sync.js";
import { createDatasetSubscriberAuthMiddleware } from "../../auth/middleware.js";
import { firstParams } from "../../utils/misc.js";
import { requireAdmin } from "../../auth/middleware.js";
//import { resolveOrganizationStore } from "../../stores/organization-store/index.js";
//import { resolveOpportunityStore } from "../../stores/opportunity-store/index.js";

export function createDatasetSyncRouter<T extends SyncRecord>(type: DatasetType, store: SyncronizingStore<T>): Router {
    const router = Router();

    const requireSubscriberAuth = createDatasetSubscriberAuthMiddleware(type);
  
    //
    // Push updates to the dataset (currently requires an admin user)
    //
    router.put("/updates", requireAdmin, async (req: Request, res: Response) => {
        const result = await store.updates(req.body as DatasetUpdates<T> );
        res.json(result);
    });

    // 
    // Pull
    //

    // List records and deletes since a given time
    router.get("/updates", requireSubscriberAuth, async (req: Request, res: Response) => {
        const query = firstParams(req) as SinceQuery;
        const result = await store.queryUpdates(query);
        res.json(result);
    });

    // List all records in the dataset
    router.get("/snapshot", requireSubscriberAuth, async (req: Request, res: Response) => {
        const query = firstParams(req) as AnyQuery;
        const result = await store.snapshot(query);
        res.json(result);
    });

    // Pull a batch of records from the dataset
    router.put("/batch-read", requireSubscriberAuth, async (req: Request, res: Response) => {
        const result = await store.batchRead(req.body as BatchRead);
        res.json(result);
    });

    return router;
}

export function createVolunteerDatasetSyncRouter(): Router {
    const store = resolveVolunteerStore();
    return createDatasetSyncRouter("volunteer", store);
}

/*
export function createOrganizationDatasetRouter(): Router {
    const store = resolveOrganizationStore();
    return createDatasetRouter("organization", store);
}

export function createOpportunityDatasetRouter(): Router {
    const store = resolveOpportunityStore();
    return createDatasetRouter("opportunity", store);
}
*/
