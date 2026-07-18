// Authentification légère : hachage scrypt (aucune dépendance native) + cookie de session signé HMAC.
// Suffisant pour un MVP. Pour la production, envisage NextAuth / une solution managée.

import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./db.js";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";
const COOKIE = "sia_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

function sign(value: string): string {
  const sig = createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${sig}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(value).digest("hex");
  return sig === expected ? value : null;
}

export function createSession(tenantId: string) {
  cookies().set(COOKIE, sign(tenantId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSessionTenant() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const tenantId = unsign(raw);
  if (!tenantId) return null;
  return prisma.tenant.findUnique({ where: { id: tenantId }, include: { agent: true } });
}
