// POST /api/public/cancel — annulation d'un rendez-vous depuis le lien sécurisé
// envoyé par SMS (identifiant du RDV + signature HMAC). Aucune session requise.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { verifyCancelSignature } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rdvId = String(body?.rdvId ?? "");
  const t = String(body?.t ?? "");
  if (!rdvId || !verifyCancelSignature(rdvId, t)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const rdv = await prisma.appointment.findUnique({ where: { id: rdvId } });
  if (!rdv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (rdv.statut !== "annule") {
    await prisma.appointment.update({
      where: { id: rdv.id },
      data: { statut: "annule" },
    });
    // Le cabinet est prévenu de l'annulation (alerte interne, journalisée).
    const agent = await prisma.agent.findUnique({ where: { tenantId: rdv.tenantId } });
    await sendSms(
      rdv.tenantId,
      agent?.numeroTransfertHumain ?? "cabinet",
      `Annulation en ligne : le rendez-vous de ${rdv.prenom} ${rdv.nom} (${rdv.dateHeure}) a été annulé par le client.`,
      "alerte",
    );
  }

  return NextResponse.json({ ok: true });
}
