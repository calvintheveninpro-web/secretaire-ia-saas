// POST /api/email/token — génère (ou régénère) le jeton du webhook d'emails entrants
// du cabinet connecté et renvoie l'URL à configurer chez le fournisseur d'emails.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { APP_URL } from "@/lib/stripe";

export async function POST() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = randomBytes(24).toString("hex");
  await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: { emailWebhookToken: token },
  });

  return NextResponse.json({
    ok: true,
    webhookUrl: `${APP_URL}/api/email/inbound?token=${token}`,
  });
}
