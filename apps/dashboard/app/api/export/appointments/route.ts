// GET /api/export/appointments — exporte les rendez-vous du cabinet connecté au format CSV.

import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  annule: "Annulé",
  reporte: "Reporté",
};

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant) return new Response("Non autorisé", { status: 401 });

  const rdvs = await prisma.appointment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Nom", "Prénom", "Téléphone", "Email", "Motif", "Date et heure", "Praticien", "Statut"],
    rdvs.map((r) => [
      r.nom,
      r.prenom,
      r.telephone,
      r.email ?? "",
      r.motif,
      r.dateHeure,
      r.praticien ?? "",
      STATUT_LABEL[r.statut] ?? r.statut,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rendez-vous.csv"',
    },
  });
}
