// GET /api/google/auth — démarre la connexion OAuth Google Calendar du cabinet connecté.

import { NextResponse } from "next/server";
import { getSessionTenant } from "@/lib/auth";
import { authUrl, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/connectors?google=non_configure", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }
  return NextResponse.redirect(authUrl(tenant.id));
}
