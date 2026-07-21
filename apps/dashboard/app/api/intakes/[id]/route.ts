// PUT /api/intakes/:id — met à jour le statut ou le potentiel d'un prospect du cabinet connecté.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const STATUTS = ["nouveau", "rdv_pris", "converti", "perdu"];
const POTENTIELS = ["fort", "standard", "hors_perimetre"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const intake = await prisma.intake.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!intake) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const data: { statut?: string; potentiel?: string } = {};
  if (typeof body.statut === "string" && STATUTS.includes(body.statut)) data.statut = body.statut;
  if (typeof body.potentiel === "string" && POTENTIELS.includes(body.potentiel)) data.potentiel = body.potentiel;

  const updated = await prisma.intake.update({ where: { id: intake.id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}
