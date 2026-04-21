import { Router } from "express";
import type { Request, Response } from "express";
import type { SyncronizingStore, AnyQuery, SinceQuery, BatchRead, StoreRecord } from "../stores/types.js";


type CrudStore<T extends StoreRecord> = {
    list: () => Promise<T[]>;
    read: (uri: string) => Promise<T | undefined>;
};

export function createDatasetRouter<T extends StoreRecord>(store: SyncronizingStore<T> & CrudStore<T>): Router {
    const router = Router();
  
    router.post("/updates", async (req: Request, res: Response) => {
        const result = await store.updates(req.body as SinceQuery );
        res.json(result);
    });

    router.post("/snapshot", async (req: Request, res: Response) => {
        const result = await store.snapshot( req.body as AnyQuery );
        res.json(result);
    });

    router.post("/batchRead", async (req: Request, res: Response) => {
        const result = await store.batchRead(req.body as BatchRead);
        res.json( result);
    });

    //==== CRUD ====
    router.get("/", async (req: Request, res: Response) => {
        const result = await store.list();
        res.json(result);
    });

    router.get("/:uri", async (req: Request, res: Response) => {
        const uri = Array.isArray(req.params.uri) ? req.params.uri[0] : req.params.uri;
        const result = await store.read(uri);
        res.json(result);
    });

    return router;
}