// GET /api/cron/daily-summary — appelé chaque jour à 18 h UTC par le cron Vercel.
// Envoie à chaque cabinet un résumé de l'activité des dernières 24 heures :
// appels, rendez-vous, prospects à fort potentiel, conflits, emails à traiter.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const depuis = new Date(Date.now() - 24 * 3600 * 1000);
  const agents = await prisma.agent.findMany({ where: { actif: true } });
  let envoyes = 0;

  for (const agent of agents) {
    const tenantId = agent.tenantId;
    const [appels, rdvs, prospectsForts, conflits, emailsATraiter] = await Promise.all([
      prisma.call.count({ where: { tenantId, startedAt: { gte: depuis } } }),
      prisma.appointment.count({ where: { tenantId, createdAt: { gte: depuis } } }),
      prisma.intake.count({ where: { tenantId, createdAt: { gte: depuis }, potentiel: "fort" } }),
      prisma.intake.count({ where: { tenantId, createdAt: { gte: depuis }, conflitDetecte: true } }),
      prisma.emailMessage.count({ where: { tenantId, statut: "nouveau" } }),
    ]);

    // Rien à signaler : pas d'email inutile.
    if (appels + rdvs + prospectsForts + conflits + emailsATraiter === 0) continue;

    const lignes = [
      `Bonjour,`,
      ``,
      `Voici le résumé des dernières 24 heures pour ${agent.nomCabinet} :`,
      `- Appels traités par la secrétaire IA : ${appels}`,
      `- Rendez-vous pris : ${rdvs}`,
      prospectsForts > 0 ? `- Prospects à fort potentiel à rappeler : ${prospectsForts}` : "",
      conflits > 0 ? `- Conflits d'intérêts détectés : ${conflits}` : "",
      emailsATraiter > 0 ? `- Emails en attente de validation : ${emailsATraiter}` : "",
      ``,
      `Retrouvez le détail sur votre tableau de bord.`,
      ``,
      `L'assistant du cabinet ${agent.nomCabinet}`,
    ].filter((l) => l !== "");

    await sendEmail(
      tenantId,
      agent.emailNotification ?? "cabinet",
      `Résumé quotidien — ${agent.nomCabinet}`,
      lignes.join("\n"),
      "notification",
    );
    envoyes++;
  }

  return NextResponse.json({ ok: true, resumesEnvoyes: envoyes });
}
