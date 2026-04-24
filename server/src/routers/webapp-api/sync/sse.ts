import type { Request, Response } from "express";

function acceptEventStream(req: Request): boolean {
    const accept = req.get("accept");
    return typeof accept === "string" && accept.includes("text/event-stream");
}

export type SseEvent = {
    event?: string;
    data: unknown;
    id?: string;
    retry?: number;
}

export type SSEWriter = {
    /** True when `Accept` asks for SSE; frames are written immediately. */
    readonly isSse: boolean;
    /** Buffered mode: push one event. SSE mode: write one frame (starts the stream on first call). */
    write(event: SseEvent): SSEWriter;
    end(status?: number): void;
};

function formatData(data: unknown): string {
    if (typeof data === "string")
        return data.replace(/\n/g, "\\n");
    else if (data !== null && typeof data === "object")
        return JSON.stringify(data);
    else
        return String(data).replace(/\n/g, "\\n");
}

function encodeEvent({ event, data, id, retry }: SseEvent): string {
    const lines: string[] = [];

    if (event)
        lines.push(`event: ${event}`);
    if (id) 
        lines.push(`id: ${id}`);
    lines.push(`data: ${formatData(data)}`); // always required
    if (retry) lines.push(`retry: ${retry}`);

    const result = `${lines.join("\n")}\n\n`;
    console.log("SSE event:", result);
    return result;
}

export function createSSEWriter(req: Request, res: Response): SSEWriter {
    const useSse = acceptEventStream(req);
    const buffer: SseEvent[] = [];
    let sseStarted = false;
    let finished = false;

    function ensureSseStarted(): void {
        if (!useSse || sseStarted) return;
        sseStarted = true;
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") res.flushHeaders();
    }

    return {
        get isSse() {
            return useSse;
        },

        write(event: SseEvent): SSEWriter {
            if (finished)
                return this;
            else if (useSse) {
                ensureSseStarted();
                res.write(encodeEvent(event));
            } else {
                buffer.push(event);
            }
            return this;
        },

        end(status = 200) {
            if (finished) return;
            finished = true;
            if (useSse) {
                ensureSseStarted();
                res.end();
                return;
            }
            if (res.headersSent)
                return;
            else
                res.status(status).json({ events: buffer });
        },
    };
}
