// GET /api/export/intakes — exporte les prospects qualifiés du cabinet connecté au format CSV.

import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const POTENTIEL_LABEL: Record<string, string> = {
  fort: "Fort potentiel",
  standard: "Standard",
  hors_perimetre: "Hors périmètre",
};

const STATUT_LABEL: Record<string, string> = {
  nouveau: "Nouveau",
  rdv_pris: "RDV pris",
  converti: "Converti",
  perdu: "Perdu",
};

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant) return new Response("Non autorisé", { status: 401 });

  const intakes = await prisma.intake.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Nom", "Prénom", "Téléphone", "Domaine de droit", "Partie adverse", "Juridiction", "Échéance", "Résumé", "Potentiel", "Statut", "Conflit d'intérêts", "Créé le"],
    intakes.map((i) => [
      i.nom ?? "",
      i.prenom ?? "",
      i.telephone,
      i.domaineDroit ?? "",
      i.partieAdverse ?? "",
      i.juridiction ?? "",
      i.echeance ?? "",
      i.resume ?? "",
      POTENTIEL_LABEL[i.potentiel] ?? i.potentiel,
      STATUT_LABEL[i.statut] ?? i.statut,
      i.conflitDetecte ? "Oui" : "Non",
      new Date(i.createdAt).toLocaleDateString("fr-FR"),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="prospects.csv"',
    },
  });
}
