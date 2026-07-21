import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { RappelStatut } from "@/components/RappelStatut";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  rappel_manque: "Appel manqué à rappeler",
  relance_prospect: "Prospect à relancer",
  confirmation: "Rendez-vous à confirmer",
};

export default async function CallbacksPage() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const rappels = await prisma.outboundTask.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const aFaire = rappels.filter((r) => r.statut === "a_faire").length;

  return (
    <div>
      <h1>Rappels</h1>
      <p className="muted">
        La secrétaire IA détecte les appels interrompus et les prospects restés sans rendez-vous :
        elle leur envoie un SMS automatiquement et vous prépare ici la liste des personnes à rappeler.
      </p>
      <p style={{ marginTop: 8 }}>
        <span className={`badge ${aFaire > 0 ? "warn" : "ok"}`}>
          {aFaire > 0 ? `${aFaire} rappel(s) à faire` : "Aucun rappel en attente"}
        </span>
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Téléphone</th>
              <th>Contexte</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rappels.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString("fr-FR")}</td>
                <td>{TYPE_LABEL[r.type] ?? r.type}</td>
                <td><a href={`tel:${r.telephone}`}>{r.telephone}</a></td>
                <td className="muted">{r.motif ?? "—"}</td>
                <td><RappelStatut rappelId={r.id} statut={r.statut} /></td>
              </tr>
            ))}
            {rappels.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Aucune tâche pour l'instant : elles se créent automatiquement au fil des appels.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
