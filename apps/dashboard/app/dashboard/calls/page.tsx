import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

const OUTCOME_LABEL: Record<string, string> = {
  rdv_pris: "RDV pris",
  transfere: "Transféré",
  message: "Message",
  info: "Information",
  abandonne: "Abandonné",
};

export default async function CallsPage() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;
  const calls = await prisma.call.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1>Journal des appels</h1>
      {calls.length === 0 && <p className="muted">Aucun appel pour l'instant.</p>}
      {calls.map((c) => {
        const transcript = JSON.parse(c.transcriptJson || "[]") as { role: string; text: string }[];
        return (
          <div className="card" key={c.id} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{c.fromNumber}</strong>{" "}
                <span className={`badge ${c.outcome === "rdv_pris" ? "ok" : "info"}`}>
                  {OUTCOME_LABEL[c.outcome] ?? c.outcome}
                </span>
              </div>
              <span className="muted">
                {new Date(c.startedAt).toLocaleString("fr-FR")} · {c.durationSec ?? "?"}s
              </span>
            </div>
            {c.summary && <p className="muted">{c.summary}</p>}
            {transcript.length > 0 && (
              <div className="transcript" style={{ marginTop: 10 }}>
                {transcript.map((t, i) => (
                  <div key={i} className={`bubble ${t.role === "agent" ? "agent" : "caller"}`}>
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
