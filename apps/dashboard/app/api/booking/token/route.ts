// POST /api/booking/token — active (ou régénère) la page publique de réservation
// en ligne du cabinet connecté et renvoie son adresse.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { APP_URL } from "@/lib/stripe";

export async function POST() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = randomBytes(16).toString("hex");
  await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: { bookingToken: token },
  });

  return NextResponse.json({ ok: true, url: `${APP_URL}/reserver/${token}` });
}
