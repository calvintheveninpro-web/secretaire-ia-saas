// POST /api/public/booking — création d'un rendez-vous depuis la page publique
// de réservation (identifiée par le jeton du cabinet). Aucune session requise.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertClientFromBooking } from "@/lib/clients";
import { sendSms } from "@/lib/sms";
import { googleConnecte, creerEvenement } from "@/lib/google";
import { cancelUrl } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(body?.token ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });
  const agent = await prisma.agent.findUnique({ where: { bookingToken: token } });
  if (!agent || !agent.actif) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const nom = String(body?.nom ?? "").trim();
  const prenom = String(body?.prenom ?? "").trim();
  const telephone = String(body?.telephone ?? "").trim();
  const motif = String(body?.motif ?? "").trim() || "Réservation en ligne";
  const creneau = String(body?.creneau ?? "").trim();
  const praticien = String(body?.praticien ?? "").trim();
  if (!nom || !telephone || !creneau) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const rdv = await prisma.appointment.create({
    data: {
      tenantId: agent.tenantId,
      nom,
      prenom,
      telephone,
      motif,
      dateHeure: creneau,
      dureeMin: agent.dureeRdvParDefautMin,
      praticien: praticien || null,
      nouveauOuExistant: null,
      statut: "confirme",
    },
  });

  await upsertClientFromBooking(agent.tenantId, { nom, prenom, telephone, email: null });

  let contenu = `${agent.nomCabinet} : votre rendez-vous du ${creneau} est confirmé. Pour annuler : ${cancelUrl(rdv.id)}`;
  let type: "confirmation" | "paiement" = "confirmation";
  if (agent.consultationPayante && agent.lienPaiement) {
    contenu = `${agent.nomCabinet} : votre rendez-vous du ${creneau} est réservé. Il sera confirmé après règlement${agent.montantConsultationEur ? ` (${agent.montantConsultationEur} €)` : ""} : ${agent.lienPaiement} — Pour annuler : ${cancelUrl(rdv.id)}`;
    type = "paiement";
  }
  await sendSms(agent.tenantId, telephone, contenu, type);

  if (googleConnecte(agent)) {
    await creerEvenement(agent, {
      titre: `RDV ${prenom} ${nom} — ${motif}`,
      description: `Rendez-vous pris via la réservation en ligne.\nTéléphone : ${telephone}${praticien ? `\nPraticien : ${praticien}` : ""}`,
      dateHeure: creneau,
      dureeMin: agent.dureeRdvParDefautMin,
    });
  }

  return NextResponse.json({ ok: true, rdvId: rdv.id });
}
