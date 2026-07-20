// Fiches clients automatisées : elles sont créées et complétées à partir des
// rendez-vous pris par la secrétaire IA, sans aucune saisie manuelle.

import { prisma } from "./db";

/** Crée automatiquement les fiches clients manquantes à partir des rendez-vous existants. */
export async function syncClientsFromAppointments(tenantId: string) {
  const [appointments, clients] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { nom: true, prenom: true, telephone: true, email: true },
    }),
    prisma.client.findMany({ where: { tenantId }, select: { telephone: true } }),
  ]);

  const existants = new Set(clients.map((c) => c.telephone));
  const nouveaux = new Map<string, { tenantId: string; nom: string; prenom: string; telephone: string; email: string | null }>();
  for (const rdv of appointments) {
    if (!rdv.telephone || existants.has(rdv.telephone)) continue;
    nouveaux.set(rdv.telephone, {
      tenantId,
      nom: rdv.nom,
      prenom: rdv.prenom,
      telephone: rdv.telephone,
      email: rdv.email,
    });
  }

  if (nouveaux.size > 0) {
    await prisma.client.createMany({
      data: Array.from(nouveaux.values()),
      skipDuplicates: true,
    });
  }
}

/** Crée ou met à jour la fiche client liée à un rendez-vous (appelé par le moteur vocal). */
export async function upsertClientFromBooking(
  tenantId: string,
  data: { nom: string; prenom: string; telephone: string; email?: string | null },
) {
  if (!data.telephone) return;
  await prisma.client.upsert({
    where: { tenantId_telephone: { tenantId, telephone: data.telephone } },
    update: {
      nom: data.nom || undefined,
      prenom: data.prenom || undefined,
      email: data.email || undefined,
    },
    create: {
      tenantId,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      email: data.email ?? null,
    },
  });
}
