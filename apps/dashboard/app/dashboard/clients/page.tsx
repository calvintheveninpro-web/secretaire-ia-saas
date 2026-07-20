import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { syncClientsFromAppointments } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  // Les fiches sont générées automatiquement à partir des rendez-vous.
  await syncClientsFromAppointments(tenant.id);

  const q = (searchParams.q ?? "").trim();
  const clients = await prisma.client.findMany({
    where: {
      tenantId: tenant.id,
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { telephone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const rdvParTelephone = await prisma.appointment.groupBy({
    by: ["telephone"],
    where: { tenantId: tenant.id },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const statsRdv = new Map(rdvParTelephone.map((r) => [r.telephone, r]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1>Fiches clients</h1>
        <a className="btn secondary small" href="/api/export/clients">Exporter en CSV</a>
      </div>
      <p className="muted">
        Chaque fiche est créée automatiquement dès que la secrétaire IA enregistre un rendez-vous.
      </p>

      <form method="get" className="searchbar">
        <input
          type="search"
          name="q"
          placeholder="Rechercher un client (nom, prénom, téléphone, email)"
          defaultValue={q}
          aria-label="Rechercher un client"
        />
        <button className="btn" type="submit">Rechercher</button>
        {q && <a className="btn secondary" href="/dashboard/clients">Effacer</a>}
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Rendez-vous</th>
              <th>Dernière activité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const stats = statsRdv.get(c.telephone);
              return (
                <tr key={c.id}>
                  <td><strong>{c.prenom} {c.nom}</strong></td>
                  <td>{c.telephone}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{stats?._count._all ?? 0}</td>
                  <td>
                    {stats?._max.createdAt
                      ? new Date(stats._max.createdAt).toLocaleDateString("fr-FR")
                      : new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td>
                    <a className="btn secondary small" href={`/dashboard/clients/${c.id}`}>Voir la fiche</a>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {q ? "Aucun client ne correspond à cette recherche." : "Aucun client pour l'instant. Les fiches apparaîtront dès le premier rendez-vous pris par l'IA."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
