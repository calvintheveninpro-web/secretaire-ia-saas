import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { IntakeStatut } from "@/components/IntakeStatut";

export const dynamic = "force-dynamic";

const POTENTIEL_LABEL: Record<string, string> = {
  fort: "Fort potentiel",
  standard: "Standard",
  hors_perimetre: "Hors périmètre",
};

export default async function ProspectsPage({ searchParams }: { searchParams: { q?: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const q = (searchParams.q ?? "").trim();
  const intakes = await prisma.intake.findMany({
    where: {
      tenantId: tenant.id,
      ...(q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { telephone: { contains: q } },
              { domaineDroit: { contains: q, mode: "insensitive" } },
              { partieAdverse: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const tous = await prisma.intake.groupBy({
    by: ["statut"],
    where: { tenantId: tenant.id },
    _count: { _all: true },
  });
  const parStatut = new Map(tous.map((s) => [s.statut, s._count._all]));
  const total = Array.from(parStatut.values()).reduce((a, b) => a + b, 0);
  const convertis = parStatut.get("converti") ?? 0;
  const tauxConversion = total > 0 ? Math.round((convertis / total) * 100) : 0;
  const conflits = await prisma.intake.count({
    where: { tenantId: tenant.id, conflitDetecte: true },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1>Prospects</h1>
        <a className="btn secondary small" href="/api/export/intakes">Exporter en CSV</a>
      </div>
      <p className="muted">
        Chaque appel de nouveau contact est qualifié automatiquement par la secrétaire IA :
        domaine de droit, partie adverse, échéance, potentiel du dossier et conflits d'intérêts.
      </p>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="muted">Prospects au total</div>
          <div className="stat">{total}</div>
        </div>
        <div className="card">
          <div className="muted">Rendez-vous pris</div>
          <div className="stat">{parStatut.get("rdv_pris") ?? 0}</div>
        </div>
        <div className="card">
          <div className="muted">Taux de conversion</div>
          <div className="stat">{tauxConversion} %</div>
        </div>
        <div className="card">
          <div className="muted">Conflits d'intérêts évités</div>
          <div className="stat">{conflits}</div>
        </div>
      </div>

      <form method="get" className="searchbar">
        <input
          type="search"
          name="q"
          placeholder="Rechercher un prospect (nom, téléphone, domaine, partie adverse)"
          defaultValue={q}
          aria-label="Rechercher un prospect"
        />
        <button className="btn" type="submit">Rechercher</button>
        {q && <a className="btn secondary" href="/dashboard/prospects">Effacer</a>}
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Prospect</th>
              <th>Domaine</th>
              <th>Partie adverse</th>
              <th>Échéance</th>
              <th>Potentiel</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {intakes.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{[i.prenom, i.nom].filter(Boolean).join(" ") || i.telephone}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {i.telephone} · {new Date(i.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  {i.resume && <div className="muted" style={{ fontSize: 12 }}>{i.resume}</div>}
                </td>
                <td>{i.domaineDroit ?? "—"}</td>
                <td>
                  {i.partieAdverse ?? "—"}
                  {i.conflitDetecte && (
                    <div><span className="badge warn">Conflit détecté</span></div>
                  )}
                </td>
                <td>{i.echeance ?? "—"}</td>
                <td>
                  <span className={`badge ${i.potentiel === "fort" ? "ok" : i.potentiel === "hors_perimetre" ? "warn" : "info"}`}>
                    {POTENTIEL_LABEL[i.potentiel] ?? i.potentiel}
                  </span>
                </td>
                <td>
                  <IntakeStatut intakeId={i.id} statut={i.statut} />
                </td>
              </tr>
            ))}
            {intakes.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {q
                    ? "Aucun prospect ne correspond à cette recherche."
                    : "Aucun prospect pour l'instant. Les fiches apparaîtront dès le premier appel qualifié par l'IA."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
