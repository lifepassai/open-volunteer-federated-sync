import crypto from 'crypto';

export function randomBase64url(length: number = 16): string {
    return crypto.randomBytes(length)
                .toString('base64')
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
}