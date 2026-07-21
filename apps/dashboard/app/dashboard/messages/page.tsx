import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { smsConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  confirmation: "Confirmation",
  rappel: "Rappel",
  alerte: "Alerte",
  paiement: "Paiement",
  notification: "Notification",
};

const STATUT_LABEL: Record<string, string> = {
  envoye: "Envoyé",
  simule: "Simulé",
  echec: "Échec",
};

const CANAL_LABEL: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  interne: "Interne",
};

export default async function MessagesPage() {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  const messages = await prisma.message.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1>Messages et alertes</h1>
      <p className="muted">
        Journal des SMS envoyés aux clients (confirmations, rappels, liens de paiement) et des
        alertes destinées au cabinet (urgences, conflits d'intérêts, prospects à fort potentiel).
      </p>
      {!smsConfigured() && (
        <p className="badge info" style={{ marginTop: 8 }}>
          Twilio non configuré : les SMS sont simulés et journalisés ici sans envoi réel.
        </p>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Canal</th>
              <th>Type</th>
              <th>Destinataire</th>
              <th>Contenu</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString("fr-FR")}</td>
                <td>{CANAL_LABEL[m.canal] ?? m.canal}</td>
                <td>{TYPE_LABEL[m.type] ?? m.type}</td>
                <td>{m.destinataire}</td>
                <td style={{ maxWidth: 420 }}>{m.contenu}</td>
                <td>
                  <span className={`badge ${m.statut === "envoye" ? "ok" : m.statut === "echec" ? "warn" : "info"}`}>
                    {STATUT_LABEL[m.statut] ?? m.statut}
                  </span>
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">Aucun message pour l'instant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
