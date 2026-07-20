import { getSessionTenant } from "@/lib/auth";
import { AgentForm } from "@/components/AgentForm";

export default async function AgentPage() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return null;
  const a = tenant.agent;

  const initial = {
    nomCabinet: a.nomCabinet,
    metier: a.metier,
    nomProfessionnel: a.nomProfessionnel,
    specialite: a.specialite ?? "",
    adresse: a.adresse ?? "",
    horairesOuverture: a.horairesOuverture,
    numeroTransfertHumain: a.numeroTransfertHumain ?? "",
    numeroEntrant: a.numeroEntrant ?? "",
    emailNotification: a.emailNotification ?? "",
    dureeRdvParDefautMin: a.dureeRdvParDefautMin,
    delaiMinAvantRdvHeures: a.delaiMinAvantRdvHeures,
    phraseAccueil: a.phraseAccueil,
    faqCabinet: JSON.parse(a.faqJson || "{}"),
    actif: a.actif,
  };

  return (
    <div>
      <h1>Configuration de l'agent</h1>
      <p className="muted">
        Ces champs alimentent le prompt de la secrétaire IA. La variante « {a.metier} » adapte
        automatiquement le ton et les questions.
      </p>
      <AgentForm initial={initial} />
    </div>
  );
}
