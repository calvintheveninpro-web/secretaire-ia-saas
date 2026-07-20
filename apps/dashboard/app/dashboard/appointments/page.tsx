import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const STATUT_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  annule: "Annulé",
  reporte: "Reporté",
};

export default async function AppointmentsPage({ searchParams }: { searchParams: { q?: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const q = (searchParams.q ?? "").trim();
  const rdvs = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { telephone: { contains: q } },
              { motif: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1>Rendez-vous</h1>
        <a className="btn secondary small" href="/api/export/appointments">Exporter en CSV</a>
      </div>

      <form method="get" className="searchbar">
        <input
          type="search"
          name="q"
          placeholder="Rechercher un rendez-vous (nom, téléphone, motif)"
          defaultValue={q}
          aria-label="Rechercher un rendez-vous"
        />
        <button className="btn" type="submit">Rechercher</button>
        {q && <a className="btn secondary" href="/dashboard/appointments">Effacer</a>}
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Patient / Client</th>
              <th>Téléphone</th>
              <th>Motif</th>
              <th>Date</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rdvs.map((r) => (
              <tr key={r.id}>
                <td>{r.prenom} {r.nom}</td>
                <td>{r.telephone}</td>
                <td>{r.motif}</td>
                <td>{r.dateHeure}</td>
                <td>
                  <span className={`badge ${r.statut === "confirme" ? "ok" : r.statut === "annule" ? "warn" : "info"}`}>
                    {STATUT_LABEL[r.statut] ?? r.statut}
                  </span>
                </td>
              </tr>
            ))}
            {rdvs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  {q ? "Aucun rendez-vous ne correspond à cette recherche." : "Aucun rendez-vous pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
