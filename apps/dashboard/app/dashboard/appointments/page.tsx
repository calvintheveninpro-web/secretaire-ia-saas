import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export default async function AppointmentsPage() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;
  const rdvs = await prisma.appointment.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1>Rendez-vous</h1>
      <div className="card" style={{ marginTop: 16 }}>
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
                    {r.statut}
                  </span>
                </td>
              </tr>
            ))}
            {rdvs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Aucun rendez-vous pour l'instant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
