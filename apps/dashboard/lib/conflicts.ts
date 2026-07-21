// Détection de conflits d'intérêts (cabinets d'avocats) :
// - la partie adverse citée est déjà cliente du cabinet ;
// - l'appelant est déjà partie adverse dans un dossier qualifié par le cabinet.

import { prisma } from "./db";

function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Vrai si l'un des deux noms complets contient le nom de famille de l'autre. */
function correspond(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (!na || !nb) return false;
  const motsA = na.split(/\s+/).filter((m) => m.length >= 3);
  const motsB = nb.split(/\s+/).filter((m) => m.length >= 3);
  return motsA.some((m) => nb.includes(m)) || motsB.some((m) => na.includes(m));
}

/** La partie adverse citée correspond-elle à un client existant du cabinet ? */
export async function adverseEstClient(tenantId: string, partieAdverse: string): Promise<boolean> {
  if (!partieAdverse.trim()) return false;
  const clients = await prisma.client.findMany({
    where: { tenantId },
    select: { nom: true, prenom: true },
  });
  return clients.some((c) => correspond(`${c.prenom} ${c.nom}`, partieAdverse));
}

/** L'appelant est-il partie adverse d'un dossier déjà qualifié par le cabinet ? */
export async function appelantEstAdverse(tenantId: string, nomAppelant: string): Promise<boolean> {
  if (!nomAppelant.trim()) return false;
  const intakes = await prisma.intake.findMany({
    where: { tenantId, partieAdverse: { not: null } },
    select: { partieAdverse: true },
  });
  return intakes.some((i) => i.partieAdverse && correspond(i.partieAdverse, nomAppelant));
}
