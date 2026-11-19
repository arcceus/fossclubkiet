import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "fossc_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fossc-kiet-default-local-secret-change-in-prod-2026"
  );
}

export function getExpectedAdminCredentials(): {
  username: string;
  password: string;
} {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "fossc2026",
  };
}

export function createSessionToken(username: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ sub: username, exp })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): { username: string } | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as { sub?: string; exp?: number };
    if (!parsed.sub || !parsed.exp) return null;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return null;
    return { username: parsed.sub };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
