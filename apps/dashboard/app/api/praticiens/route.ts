// POST /api/praticiens — ajoute un praticien au cabinet connecté.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export async function POST(req: Request) {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const nom = String(body?.nom ?? "").trim();
  if (!nom) return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const praticien = await prisma.praticien.create({
    data: {
      agentId: tenant.agent.id,
      nom,
      specialites: body?.specialites ? String(body.specialites) : null,
    },
  });
  return NextResponse.json({ ok: true, praticien });
}
