// PUT /api/praticiens/:id — met à jour un praticien (nom, spécialités, actif).
// DELETE /api/praticiens/:id — retire un praticien du cabinet.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

async function praticienDuCabinet(id: string) {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return { tenant: null, praticien: null };
  const praticien = await prisma.praticien.findFirst({
    where: { id, agentId: tenant.agent.id },
  });
  return { tenant, praticien };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { tenant, praticien } = await praticienDuCabinet(params.id);
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!praticien) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.praticien.update({
    where: { id: praticien.id },
    data: {
      nom: typeof body?.nom === "string" && body.nom.trim() ? body.nom.trim() : undefined,
      specialites: typeof body?.specialites === "string" ? body.specialites : undefined,
      actif: typeof body?.actif === "boolean" ? body.actif : undefined,
    },
  });
  return NextResponse.json({ ok: true, praticien: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { tenant, praticien } = await praticienDuCabinet(params.id);
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!praticien) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.praticien.delete({ where: { id: praticien.id } });
  return NextResponse.json({ ok: true });
}
