import { OAuth2Client } from "google-auth-library";
import type { Request } from "express";

const googleOAuthClient = new OAuth2Client();

export type GoogleAuthClaims = {
  email: string;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleAuthClaims> {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (typeof audience !== "string" || audience.length === 0) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      throw new Error("Invalid token payload");
    }
    const email = payload.email;
    if (typeof email !== "string" || email.length === 0) {
      throw new Error("Token missing email claim");
    }
    return {
      email,
      ...(typeof payload.name === "string" ? { name: payload.name } : {}),
      ...(typeof payload.picture === "string" ? { picture: payload.picture } : {}),
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes("Token used too late") || raw.includes("used too early") || raw.includes("Expired")) {
      throw new Error(
        "ID token expired or no longer valid. Google ID tokens are short-lived; sign in again to obtain a fresh token.",
      );
    }
    throw err;
  }
}

/*
export async function requireGoogleAuth(req: Request): Promise<GoogleAuthClaims> {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) throw new Error("Unauthorized");
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("Unauthorized");
  const idToken = m[1]?.trim();
  if (!idToken) throw new Error("Unauthorized");
  return await verifyGoogleIdToken(idToken);
}*/

