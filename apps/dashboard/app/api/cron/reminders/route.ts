// GET /api/cron/reminders — appelé chaque jour à 7 h UTC par le cron Vercel (vercel.json).
// Envoie le SMS de rappel pour chaque rendez-vous confirmé qui a lieu dans les 24 prochaines heures.
// (Le plan Vercel Hobby limite les crons à une exécution quotidienne.)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

/** Interprète les dates stockées en texte ("2026-07-21 14:30" ou ISO). Renvoie null sinon. */
function parseDateHeure(s: string): Date | null {
  const d = new Date(s.trim().replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  // Si CRON_SECRET est défini, Vercel l'envoie en Authorization: Bearer — on le vérifie.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const candidats = await prisma.appointment.findMany({
    where: { statut: "confirme", rappelEnvoye: false },
    take: 500,
  });

  const maintenant = Date.now();
  const dans24h = maintenant + 24 * 3600 * 1000;
  let envoyes = 0;

  for (const rdv of candidats) {
    const date = parseDateHeure(rdv.dateHeure);
    if (!date) continue;
    const t = date.getTime();
    if (t < maintenant || t > dans24h) continue;

    const agent = await prisma.agent.findUnique({ where: { tenantId: rdv.tenantId } });
    await sendSms(
      rdv.tenantId,
      rdv.telephone,
      `${agent?.nomCabinet ?? "Votre cabinet"} : rappel de votre rendez-vous demain, le ${date.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}. Répondez ANNULER pour annuler.`,
      "rappel",
    );
    await prisma.appointment.update({
      where: { id: rdv.id },
      data: { rappelEnvoye: true },
    });
    envoyes++;
  }

  return NextResponse.json({ ok: true, rappelsEnvoyes: envoyes });
}
