// PUT /api/rappels/:id — met à jour le statut d'une tâche de rappel du cabinet connecté.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const STATUTS = ["a_faire", "fait", "annule"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tache = await prisma.outboundTask.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!tache) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  if (typeof body?.statut !== "string" || !STATUTS.includes(body.statut)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  await prisma.outboundTask.update({
    where: { id: tache.id },
    data: { statut: body.statut },
  });
  return NextResponse.json({ ok: true });
}
