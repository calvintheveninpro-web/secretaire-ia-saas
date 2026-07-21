// GET /api/cron/daily-summary — appelé chaque jour à 18 h UTC par le cron Vercel.
// Envoie à chaque cabinet un résumé de l'activité des dernières 24 heures :
// appels, rendez-vous, prospects à fort potentiel, conflits, emails à traiter.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const depuis = new Date(Date.now() - 24 * 3600 * 1000);
  const agents = await prisma.agent.findMany({ where: { actif: true } });
  let envoyes = 0;
  let purges = 0;
  let relances = 0;

  // Relance des prospects dormants : qualifiés il y a plus de 48 h, toujours sans
  // rendez-vous et jamais relancés — un seul SMS de relance, puis tâche de suivi.
  const il48h = new Date(Date.now() - 48 * 3600 * 1000);
  const dormants = await prisma.intake.findMany({
    where: {
      statut: "nouveau",
      relanceEnvoyee: false,
      createdAt: { lt: il48h },
      conflitDetecte: false,
      potentiel: { not: "hors_perimetre" },
    },
    take: 100,
  });
  for (const prospect of dormants) {
    const agent = agents.find((a) => a.tenantId === prospect.tenantId);
    if (!agent || !prospect.telephone) continue;
    await sendSms(
      prospect.tenantId,
      prospect.telephone,
      `${agent.nomCabinet} : suite à votre appel, souhaitez-vous convenir d'un rendez-vous ? Rappelez-nous quand vous voulez, notre assistant répond 24h/24.`,
      "notification",
    );
    await prisma.intake.update({
      where: { id: prospect.id },
      data: { relanceEnvoyee: true },
    });
    await prisma.outboundTask.create({
      data: {
        tenantId: prospect.tenantId,
        telephone: prospect.telephone,
        type: "relance_prospect",
        motif: `${[prospect.prenom, prospect.nom].filter(Boolean).join(" ") || "Prospect"} — ${prospect.domaineDroit ?? "demande"} sans rendez-vous depuis 48 h`,
      },
    });
    relances++;
  }

  // Purge de conservation (RGPD) : suppression des appels plus anciens que la durée
  // choisie par chaque cabinet dans l'onglet Conformité (0 = conservation illimitée).
  const tousAgents = await prisma.agent.findMany({ where: { retentionJours: { gt: 0 } } });
  for (const agent of tousAgents) {
    const limite = new Date(Date.now() - agent.retentionJours * 24 * 3600 * 1000);
    const res = await prisma.call.deleteMany({
      where: { tenantId: agent.tenantId, startedAt: { lt: limite } },
    });
    purges += res.count;
  }

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

  return NextResponse.json({
    ok: true,
    resumesEnvoyes: envoyes,
    appelsPurges: purges,
    prospectsRelances: relances,
  });
}
