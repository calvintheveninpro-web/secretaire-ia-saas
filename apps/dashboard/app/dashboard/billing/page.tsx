import { getSessionTenant } from "@/lib/auth";
import { stripeConfigured } from "@/lib/stripe";
import { SubscribeButton } from "@/components/SubscribeButton";

const PLAN_LABEL: Record<string, string> = {
  trial: "Essai",
  actif: "Actif",
  suspendu: "Suspendu",
};

export default async function BillingPage({ searchParams }: { searchParams: { success?: string; demo?: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return null;

  return (
    <div>
      <h1>Abonnement</h1>
      {searchParams.success && <p className="badge ok">Paiement confirmé, merci !</p>}
      {searchParams.demo && <p className="badge info">Mode démo : abonnement activé sans paiement réel.</p>}

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Plan actuel</h3>
          <p className="stat" style={{ fontSize: 24 }}>{PLAN_LABEL[tenant.plan] ?? tenant.plan}</p>
          <p className="muted">
            {tenant.plan === "actif"
              ? "Votre agent est pleinement opérationnel."
              : "Activez l'abonnement pour mettre votre secrétaire IA en production."}
          </p>
        </div>
        <div className="card">
          <h3>Offre unique — Tout compris</h3>
          <p className="stat" style={{ fontSize: 28 }}>
            279,99 € <span className="muted" style={{ fontSize: 14 }}>/ mois</span>
          </p>
          <p className="muted">Un seul abonnement, sans engagement, qui couvre tout :</p>
          <ul className="muted" style={{ paddingLeft: 18, marginTop: 8 }}>
            <li>Agent IA vocal et écrit, disponible 24h/24 et 7j/7</li>
            <li>Prise, annulation et report de rendez-vous</li>
            <li>Fiches clients automatisées et journal des appels</li>
            <li>Qualification juridique des prospects et détection des conflits d'intérêts</li>
            <li>Rappels de rendez-vous par SMS et consultation payante en ligne</li>
            <li>Transfert vers un humain et détection des urgences</li>
            <li>Page de réservation en ligne et widget pour votre site</li>
            <li>Synchronisation Google Calendar et connecteurs (Outlook, Doctolib…)</li>
            <li>Multi-praticiens, exports et conformité RGPD / AI Act intégrée</li>
            <li>Confirmations par SMS et par email</li>
          </ul>
          <SubscribeButton />
          {!stripeConfigured() && (
            <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Stripe non configuré : le bouton simule l'activation (mode démo).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
