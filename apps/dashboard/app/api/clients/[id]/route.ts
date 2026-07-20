// PUT /api/clients/:id — met à jour la fiche client (notes internes) du cabinet connecté.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { notes: typeof body.notes === "string" ? body.notes : client.notes },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}
