import { prisma } from "@/lib/db";
import { verifyCancelSignature } from "@/lib/booking";
import { CancelButton } from "@/components/CancelButton";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  annule: "Annulé",
  reporte: "Reporté",
};

export default async function RdvPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  const t = searchParams.t ?? "";
  const valide = verifyCancelSignature(params.id, t);

  if (!valide) {
    return (
      <div className="center">
        <div className="card">
          <h1>Lien invalide</h1>
          <p className="muted">Ce lien d'annulation n'est pas valide. Contactez le cabinet.</p>
        </div>
      </div>
    );
  }

  const rdv = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!rdv) {
    return (
      <div className="center">
        <div className="card">
          <h1>Rendez-vous introuvable</h1>
          <p className="muted">Ce rendez-vous n'existe pas ou a déjà été supprimé.</p>
        </div>
      </div>
    );
  }

  const agent = await prisma.agent.findUnique({ where: { tenantId: rdv.tenantId } });

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 32 }}>Votre rendez-vous</h1>
      {agent && <p className="muted">{agent.nomCabinet}</p>}
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <tbody>
            <tr><th style={{ width: 140 }}>Au nom de</th><td>{rdv.prenom} {rdv.nom}</td></tr>
            <tr><th>Date et heure</th><td>{rdv.dateHeure}</td></tr>
            <tr><th>Motif</th><td>{rdv.motif}</td></tr>
            {rdv.praticien && <tr><th>Praticien</th><td>{rdv.praticien}</td></tr>}
            <tr>
              <th>Statut</th>
              <td>
                <span className={`badge ${rdv.statut === "confirme" ? "ok" : rdv.statut === "annule" ? "warn" : "info"}`}>
                  {STATUT_LABEL[rdv.statut] ?? rdv.statut}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {rdv.statut === "annule" ? (
          <p className="muted" style={{ marginTop: 16 }}>
            Ce rendez-vous est annulé. Pour en reprendre un, contactez le cabinet.
          </p>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p className="muted">Un empêchement ? Vous pouvez annuler ce rendez-vous ci-dessous.</p>
            <CancelButton rdvId={rdv.id} t={t} />
          </div>
        )}
      </div>
    </div>
  );
}
