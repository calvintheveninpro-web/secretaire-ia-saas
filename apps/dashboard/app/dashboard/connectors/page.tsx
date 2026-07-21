import { getSessionTenant } from "@/lib/auth";
import { googleConfigured, googleConnecte } from "@/lib/google";
import { ConnectorList } from "@/components/ConnectorList";
import { BookingConfig } from "@/components/BookingConfig";
import { APP_URL } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: { google?: string };
}) {
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
      {searchParams.google === "ok" && (
        <p className="badge ok" style={{ marginTop: 8 }}>
          Google Calendar connecté : l'IA propose désormais les créneaux réellement libres de votre agenda.
        </p>
      )}
      {searchParams.google && searchParams.google !== "ok" && searchParams.google !== "non_configure" && (
        <p className="badge warn" style={{ marginTop: 8 }}>
          La connexion Google a échoué, réessayez.
        </p>
      )}
      {searchParams.google === "non_configure" && (
        <p className="badge info" style={{ marginTop: 8 }}>
          La connexion Google n'est pas encore configurée sur la plateforme (identifiants OAuth manquants).
        </p>
      )}
      <BookingConfig
        initialUrl={tenant.agent.bookingToken ? `${APP_URL}/reserver/${tenant.agent.bookingToken}` : null}
      />
      <ConnectorList
        initial={etat}
        googleOauth={googleConfigured()}
        googleDejaConnecte={googleConnecte(tenant.agent)}
      />
    </div>
  );
}
