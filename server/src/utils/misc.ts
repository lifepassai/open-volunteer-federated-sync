import crypto from 'crypto';
import type { Request } from 'express';

export function randomBase64url(length: number = 16): string {
    return crypto.randomBytes(length)
                .toString('base64')
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
}

/** Express route params as a single string per key (first element if value were ever an array). */
export function firstParams(req: Request): Record<string, string> {
    return Object.entries(req.params ?? {}).reduce<Record<string, string>>((out, [key, value]) => {
        out[key] = Array.isArray(value) ? value[0] : value;
        return out;
    }, {});
}

export function fullJson(obj: unknown): string {
    return JSON.stringify(obj, null, 4);
}