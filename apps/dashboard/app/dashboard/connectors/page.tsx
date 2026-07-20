import { getSessionTenant } from "@/lib/auth";
import { ConnectorList } from "@/components/ConnectorList";

export default async function ConnectorsPage() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return null;

  let etat: Record<string, { actif: boolean; config?: string; connecteLe?: string }> = {};
  try {
    etat = JSON.parse(tenant.agent.connecteursJson || "{}");
  } catch {
    etat = {};
  }

  return (
    <div>
      <h1>Connecteurs</h1>
      <p className="muted">
        Reliez la secrétaire IA à vos outils : agenda, téléphonie, notifications.
        Les rendez-vous et les alertes se synchronisent automatiquement avec les services activés.
      </p>
      <ConnectorList initial={etat} />
    </div>
  );
}
