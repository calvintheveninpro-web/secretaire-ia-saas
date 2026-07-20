// GET /api/connectors — état des connecteurs du cabinet connecté.
// PUT /api/connectors — enregistre l'état des connecteurs (activation, configuration).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let connecteurs = {};
  try {
    connecteurs = JSON.parse(tenant.agent.connecteursJson || "{}");
  } catch {
    connecteurs = {};
  }
  return NextResponse.json({ connecteurs });
}

export async function PUT(req: Request) {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const connecteurs = body?.connecteurs;
  if (connecteurs == null || typeof connecteurs !== "object" || Array.isArray(connecteurs)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: { connecteursJson: JSON.stringify(connecteurs) },
  });
  return NextResponse.json({ ok: true });
}
