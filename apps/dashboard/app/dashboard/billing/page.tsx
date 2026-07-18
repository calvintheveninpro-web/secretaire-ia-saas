import { getSessionTenant } from "@/lib/auth";
import { stripeConfigured } from "@/lib/stripe";
import { SubscribeButton } from "@/components/SubscribeButton";

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
          <p className="stat" style={{ fontSize: 24 }}>{tenant.plan}</p>
          <p className="muted">
            {tenant.plan === "actif"
              ? "Ton agent est pleinement opérationnel."
              : "Active un abonnement pour mettre ta secrétaire IA en production."}
          </p>
        </div>
        <div className="card">
          <h3>Secrétaire IA — Premium</h3>
          <p className="stat" style={{ fontSize: 28 }}>149 € <span className="muted" style={{ fontSize: 14 }}>/ mois</span></p>
          <p className="muted">Appels illimités* · prise de RDV · transfert · journal & transcriptions.</p>
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
