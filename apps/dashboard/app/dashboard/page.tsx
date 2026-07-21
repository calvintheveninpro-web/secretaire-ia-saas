import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const PLAN_LABEL: Record<string, string> = {
  trial: "Essai",
  actif: "Actif",
  suspendu: "Suspendu",
};

const OUTCOME_LABEL: Record<string, string> = {
  rdv_pris: "RDV pris",
  transfere: "Transféré",
  message: "Message",
  info: "Information",
  abandonne: "Abandonné",
  demarchage: "Démarchage écarté",
};

const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export default async function Overview() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const [callCount, rdvCount, rdvPris, appointments, calls, rappelsAFaire, praticienCount] =
    await Promise.all([
      prisma.call.count({ where: { tenantId: tenant.id } }),
      prisma.appointment.count({ where: { tenantId: tenant.id, statut: "confirme" } }),
      prisma.call.count({ where: { tenantId: tenant.id, outcome: "rdv_pris" } }),
      prisma.appointment.findMany({
        where: { tenantId: tenant.id },
        select: { createdAt: true },
      }),
      prisma.call.findMany({
        where: { tenantId: tenant.id },
        select: { durationSec: true, outcome: true, startedAt: true },
      }),
      prisma.outboundTask.count({ where: { tenantId: tenant.id, statut: "a_faire" } }),
      tenant.agent
        ? prisma.praticien.count({ where: { agentId: tenant.agent.id } })
        : Promise.resolve(0),
    ]);

  // Consultations par mois (12 derniers mois) et par an — calculées automatiquement.
  const now = new Date();
  const parMois: { label: string; annee: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    parMois.push({ label: MOIS_COURT[d.getMonth()], annee: d.getFullYear(), count: 0 });
  }
  const parAn = new Map<number, number>();
  for (const a of appointments) {
    const d = new Date(a.createdAt);
    parAn.set(d.getFullYear(), (parAn.get(d.getFullYear()) ?? 0) + 1);
    const diffMois = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diffMois >= 0 && diffMois <= 11) parMois[11 - diffMois].count += 1;
  }
  const consultationsMoisCourant = parMois[11].count;
  const consultationsAnneeCourante = parAn.get(now.getFullYear()) ?? 0;
  const maxMois = Math.max(1, ...parMois.map((m) => m.count));
  const annees = Array.from(parAn.entries()).sort((a, b) => b[0] - a[0]);

  // Statistiques d'appels.
  const durations = calls.map((c) => c.durationSec).filter((d): d is number => d != null);
  const dureeMoyenne = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0;
  const parOutcome = new Map<string, number>();
  for (const c of calls) parOutcome.set(c.outcome, (parOutcome.get(c.outcome) ?? 0) + 1);

  // Heures de pointe : répartition des appels par heure (8 h à 19 h).
  const parHeure = Array.from({ length: 12 }, (_, i) => ({ heure: i + 8, count: 0 }));
  for (const c of calls) {
    const h = new Date(c.startedAt).getHours();
    if (h >= 8 && h < 20) parHeure[h - 8].count += 1;
  }
  const maxHeure = Math.max(1, ...parHeure.map((h) => h.count));

  // Parcours de démarrage : étapes restantes pour un cabinet qui vient de s'inscrire.
  let connecteurActif = false;
  try {
    const conns = JSON.parse(tenant.agent?.connecteursJson || "{}");
    connecteurActif =
      Boolean(tenant.agent?.googleTokensJson) ||
      Object.values(conns).some((c: any) => c?.actif);
  } catch {
    connecteurActif = Boolean(tenant.agent?.googleTokensJson);
  }
  const etapes = [
    {
      label: "Renseigner le numéro entrant de la secrétaire IA",
      fait: Boolean(tenant.agent?.numeroEntrant),
      lien: "/dashboard/agent",
    },
    {
      label: "Ajouter les praticiens du cabinet",
      fait: praticienCount > 0,
      lien: "/dashboard/agent",
    },
    {
      label: "Connecter votre agenda ou un autre outil",
      fait: connecteurActif,
      lien: "/dashboard/connectors",
    },
    {
      label: "Activer la réception des emails",
      fait: Boolean(tenant.agent?.emailWebhookToken),
      lien: "/dashboard/emails",
    },
    {
      label: "Activer votre abonnement",
      fait: tenant.plan === "actif",
      lien: "/dashboard/billing",
    },
  ];
  const etapesRestantes = etapes.filter((e) => !e.fait);

  const planBadge =
    tenant.plan === "actif" ? "ok" : tenant.plan === "suspendu" ? "warn" : "info";

  return (
    <div>
      <h1>Bonjour, {tenant.nom}</h1>
      <p className="muted">
        Statut de l'abonnement :{" "}
        <span className={`badge ${planBadge}`}>{PLAN_LABEL[tenant.plan] ?? tenant.plan}</span>
        {tenant.agent?.actif ? (
          <span className="badge ok" style={{ marginLeft: 8 }}>Agent actif</span>
        ) : (
          <span className="badge warn" style={{ marginLeft: 8 }}>Agent en pause</span>
        )}
      </p>

      {etapesRestantes.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Bien démarrer</h3>
          <p className="muted">
            Encore {etapesRestantes.length} étape(s) pour que votre secrétaire IA soit pleinement opérationnelle.
          </p>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {etapes.map((e) => (
                <tr key={e.label}>
                  <td style={{ width: 130 }}>
                    {e.fait ? (
                      <span className="badge ok">Fait</span>
                    ) : (
                      <span className="badge info">À faire</span>
                    )}
                  </td>
                  <td>{e.fait ? e.label : <a href={e.lien}>{e.label}</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-4" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="muted">Appels traités</div>
          <div className="stat">{callCount}</div>
        </div>
        <div className="card">
          <div className="muted">Rendez-vous pris par l'IA</div>
          <div className="stat">{rdvPris}</div>
        </div>
        <div className="card">
          <div className="muted">Consultations ce mois-ci</div>
          <div className="stat">{consultationsMoisCourant}</div>
        </div>
        <div className="card">
          <div className="muted">Consultations cette année</div>
          <div className="stat">{consultationsAnneeCourante}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Consultations par mois</h3>
          <p className="muted">Nombre de consultations enregistrées sur les 12 derniers mois.</p>
          <div className="chart">
            {parMois.map((m, i) => (
              <div className="col" key={i}>
                <span className="val">{m.count}</span>
                <div
                  className="bar"
                  style={{ height: `${Math.round((m.count / maxMois) * 100)}%` }}
                  title={`${m.label} ${m.annee} : ${m.count} consultation(s)`}
                />
                <span className="lbl">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Consultations par an</h3>
          <p className="muted">Total annuel, mis à jour automatiquement.</p>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Année</th>
                <th>Consultations</th>
              </tr>
            </thead>
            <tbody>
              {annees.map(([annee, count]) => (
                <tr key={annee}>
                  <td>{annee}</td>
                  <td>{count}</td>
                </tr>
              ))}
              {annees.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">Aucune consultation pour l'instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Activité des appels</h3>
          <p className="muted">Durée moyenne : {dureeMoyenne} s</p>
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Issue de l'appel</th>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(parOutcome.entries()).map(([outcome, count]) => (
                <tr key={outcome}>
                  <td>{OUTCOME_LABEL[outcome] ?? outcome}</td>
                  <td>{count}</td>
                </tr>
              ))}
              {parOutcome.size === 0 && (
                <tr>
                  <td colSpan={2} className="muted">Aucun appel pour l'instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Numéro de la secrétaire IA</h3>
          <p className="muted">
            Redirigez la ligne du cabinet vers ce numéro pour que l'IA décroche.
          </p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>
            {tenant.agent?.numeroEntrant ?? "À configurer dans « Mon agent »"}
          </p>
          <p className="muted">
            Rendez-vous confirmés à venir : <strong>{rdvCount}</strong>
            {" · "}
            Rappels à faire : <strong>{rappelsAFaire}</strong>
            {rappelsAFaire > 0 && (
              <>
                {" "}
                (<a href="/dashboard/callbacks">voir la liste</a>)
              </>
            )}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Heures de pointe des appels</h3>
        <p className="muted">
          Répartition des appels reçus entre 8 h et 20 h — utile pour ajuster vos permanences.
        </p>
        <div className="chart">
          {parHeure.map((h) => (
            <div className="col" key={h.heure}>
              <span className="val">{h.count}</span>
              <div
                className="bar"
                style={{ height: `${Math.round((h.count / maxHeure) * 100)}%` }}
                title={`${h.heure} h : ${h.count} appel(s)`}
              />
              <span className="lbl">{h.heure}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
