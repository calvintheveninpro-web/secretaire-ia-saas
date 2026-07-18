import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export default async function Overview() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const [callCount, rdvCount, rdvPris] = await Promise.all([
    prisma.call.count({ where: { tenantId: tenant.id } }),
    prisma.appointment.count({ where: { tenantId: tenant.id, statut: "confirme" } }),
    prisma.call.count({ where: { tenantId: tenant.id, outcome: "rdv_pris" } }),
  ]);

  const planBadge =
    tenant.plan === "actif" ? "ok" : tenant.plan === "suspendu" ? "warn" : "info";

  return (
    <div>
      <h1>Bonjour, {tenant.nom} 👋</h1>
      <p className="muted">
        Statut de l'abonnement : <span className={`badge ${planBadge}`}>{tenant.plan}</span>
        {tenant.agent?.actif ? (
          <span className="badge ok" style={{ marginLeft: 8 }}>Agent actif</span>
        ) : (
          <span className="badge warn" style={{ marginLeft: 8 }}>Agent en pause</span>
        )}
      </p>

      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="muted">Appels traités</div>
          <div className="stat">{callCount}</div>
        </div>
        <div className="card">
          <div className="muted">Rendez-vous pris par l'IA</div>
          <div className="stat">{rdvPris}</div>
        </div>
        <div className="card">
          <div className="muted">RDV confirmés à venir</div>
          <div className="stat">{rdvCount}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Numéro de la secrétaire IA</h3>
        <p className="muted">
          Redirige la ligne du cabinet vers ce numéro pour que l'IA décroche.
        </p>
        <p style={{ fontSize: 22, fontWeight: 700 }}>
          {tenant.agent?.numeroEntrant ?? "À configurer dans « Mon agent »"}
        </p>
      </div>
    </div>
  );
}
