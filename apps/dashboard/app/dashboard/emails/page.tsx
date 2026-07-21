import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { APP_URL } from "@/lib/stripe";
import { EmailInbox } from "@/components/EmailInbox";
import { EmailWebhookConfig } from "@/components/EmailWebhookConfig";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return null;

  const emails = await prisma.emailMessage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const webhookUrl = tenant.agent.emailWebhookToken
    ? `${APP_URL}/api/email/inbound?token=${tenant.agent.emailWebhookToken}`
    : null;

  return (
    <div>
      <h1>Emails entrants</h1>
      <p className="muted">
        La secrétaire IA lit les emails reçus par le cabinet et prépare un brouillon de réponse :
        vous le relisez, l'ajustez si besoin, puis l'envoyez en un clic.
      </p>
      {!emailConfigured() && (
        <p className="badge info" style={{ marginTop: 8 }}>
          Brevo non configuré : les envois sont simulés et journalisés dans l'onglet Messages.
        </p>
      )}

      <EmailWebhookConfig initialUrl={webhookUrl} />

      <EmailInbox
        initial={emails.map((e) => ({
          id: e.id,
          deEmail: e.deEmail,
          objet: e.objet,
          contenu: e.contenu,
          brouillon: e.brouillon ?? "",
          statut: e.statut,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
