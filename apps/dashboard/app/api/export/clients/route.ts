// GET /api/export/clients — exporte les fiches clients du cabinet connecté au format CSV.

import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { syncClientsFromAppointments } from "@/lib/clients";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant) return new Response("Non autorisé", { status: 401 });

  await syncClientsFromAppointments(tenant.id);
  const clients = await prisma.client.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const csv = toCsv(
    ["Nom", "Prénom", "Téléphone", "Email", "Notes", "Fiche créée le"],
    clients.map((c) => [
      c.nom,
      c.prenom,
      c.telephone,
      c.email ?? "",
      c.notes,
      new Date(c.createdAt).toLocaleDateString("fr-FR"),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients.csv"',
    },
  });
}
