// POST /api/google/disconnect — déconnecte l'agenda Google du cabinet connecté.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export async function POST() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let connecteurs: Record<string, any> = {};
  try {
    connecteurs = JSON.parse(tenant.agent.connecteursJson || "{}");
  } catch {
    connecteurs = {};
  }
  if (connecteurs.google_calendar) {
    connecteurs.google_calendar = { ...connecteurs.google_calendar, actif: false, oauth: false };
  }

  await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: { googleTokensJson: null, connecteursJson: JSON.stringify(connecteurs) },
  });
  return NextResponse.json({ ok: true });
}
