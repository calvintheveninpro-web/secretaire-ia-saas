// POST /api/calls — le moteur vocal enregistre le compte-rendu d'un appel terminé.
// GET  /api/calls — liste des appels du cabinet connecté (dashboard).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const started = body.startedAt ? new Date(body.startedAt) : new Date();
  const ended = body.endedAt ? new Date(body.endedAt) : null;
  const call = await prisma.call.create({
    data: {
      tenantId: body.tenantId,
      fromNumber: body.fromNumber ?? "inconnu",
      startedAt: started,
      endedAt: ended,
      durationSec: ended ? Math.round((ended.getTime() - started.getTime()) / 1000) : null,
      outcome: body.outcome ?? "info",
      transcriptJson: JSON.stringify(body.transcript ?? []),
      summary: body.summary ?? null,
    },
  });
  return NextResponse.json({ ok: true, id: call.id });
}

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const calls = await prisma.call.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(calls);
}
