// PUT /api/compliance — met à jour les réglages de conformité du cabinet connecté
// (durée de conservation des appels et transcriptions).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const DUREES_AUTORISEES = [0, 30, 90, 180, 365, 730];

export async function PUT(req: Request) {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const retentionJours = Number(body?.retentionJours);
  if (!DUREES_AUTORISEES.includes(retentionJours)) {
    return NextResponse.json({ error: "invalid_retention" }, { status: 400 });
  }

  await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: { retentionJours },
  });
  return NextResponse.json({ ok: true });
}
