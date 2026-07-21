// GET /api/export/calls — exporte le journal des appels du cabinet connecté au format CSV.

import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const OUTCOME_LABEL: Record<string, string> = {
  rdv_pris: "RDV pris",
  transfere: "Transféré",
  message: "Message",
  info: "Information",
  abandonne: "Abandonné",
};

export async function GET() {
  const tenant = await getSessionTenant();
  if (!tenant) return new Response("Non autorisé", { status: 401 });

  const calls = await prisma.call.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startedAt: "desc" },
  });

  const csv = toCsv(
    ["Date", "Numéro", "Durée (s)", "Issue", "Résumé"],
    calls.map((c) => [
      new Date(c.startedAt).toLocaleString("fr-FR"),
      c.fromNumber,
      c.durationSec != null ? String(c.durationSec) : "",
      OUTCOME_LABEL[c.outcome] ?? c.outcome,
      c.summary ?? "",
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appels.csv"',
    },
  });
}
