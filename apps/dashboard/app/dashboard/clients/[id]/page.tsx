import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { ClientNotes } from "@/components/ClientNotes";

const STATUT_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  annule: "Annulé",
  reporte: "Reporté",
};

const OUTCOME_LABEL: Record<string, string> = {
  rdv_pris: "RDV pris",
  transfere: "Transféré",
  message: "Message",
  info: "Information",
  abandonne: "Abandonné",
  demarchage: "Démarchage écarté",
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!client) {
    return (
      <div>
        <h1>Fiche introuvable</h1>
        <p className="muted">Ce client n'existe pas ou n'appartient pas à votre cabinet.</p>
        <a className="btn secondary" href="/dashboard/clients">Retour aux clients</a>
      </div>
    );
  }

  const [rdvs, calls, intakes] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: tenant.id, telephone: client.telephone },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.call.findMany({
      where: { tenantId: tenant.id, fromNumber: client.telephone },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.intake.findMany({
      where: { tenantId: tenant.id, telephone: client.telephone },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1>{client.prenom} {client.nom}</h1>
        <a className="btn secondary small" href="/dashboard/clients">Retour aux clients</a>
      </div>
      <p className="muted">Fiche client générée automatiquement à partir des échanges avec la secrétaire IA.</p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Coordonnées</h3>
          <table style={{ marginTop: 8 }}>
            <tbody>
              <tr><th>Téléphone</th><td>{client.telephone}</td></tr>
              <tr><th>Email</th><td>{client.email ?? "Non renseigné"}</td></tr>
              <tr><th>Fiche créée le</th><td>{new Date(client.createdAt).toLocaleDateString("fr-FR")}</td></tr>
              <tr><th>Rendez-vous au total</th><td>{rdvs.length}</td></tr>
              <tr><th>Appels au total</th><td>{calls.length}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Notes internes</h3>
          <p className="muted">Visibles uniquement par le cabinet.</p>
          <ClientNotes clientId={client.id} initialNotes={client.notes} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Historique des rendez-vous</h3>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Motif</th>
              <th>Praticien</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rdvs.map((r) => (
              <tr key={r.id}>
                <td>{r.dateHeure}</td>
                <td>{r.motif}</td>
                <td>{r.praticien ?? "—"}</td>
                <td>
                  <span className={`badge ${r.statut === "confirme" ? "ok" : r.statut === "annule" ? "warn" : "info"}`}>
                    {STATUT_LABEL[r.statut] ?? r.statut}
                  </span>
                </td>
              </tr>
            ))}
            {rdvs.length === 0 && (
              <tr><td colSpan={4} className="muted">Aucun rendez-vous pour ce client.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {intakes.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Qualifications juridiques</h3>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Domaine</th>
                <th>Partie adverse</th>
                <th>Échéance</th>
                <th>Résumé</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((i) => (
                <tr key={i.id}>
                  <td>{new Date(i.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>{i.domaineDroit ?? "—"}</td>
                  <td>
                    {i.partieAdverse ?? "—"}
                    {i.conflitDetecte && (
                      <div><span className="badge warn">Conflit détecté</span></div>
                    )}
                  </td>
                  <td>{i.echeance ?? "—"}</td>
                  <td className="muted">{i.resume ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Historique des appels</h3>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Durée</th>
              <th>Issue</th>
              <th>Résumé</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.startedAt).toLocaleString("fr-FR")}</td>
                <td>{c.durationSec != null ? `${c.durationSec} s` : "—"}</td>
                <td>{OUTCOME_LABEL[c.outcome] ?? c.outcome}</td>
                <td className="muted">{c.summary ?? "—"}</td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr><td colSpan={4} className="muted">Aucun appel pour ce client.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
