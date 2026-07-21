import { getSessionTenant } from "@/lib/auth";
import { RetentionSetting } from "@/components/RetentionSetting";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return null;
  const a = tenant.agent;

  const transparenceOk = /assistant virtuel|assistante virtuelle|intelligence artificielle/i.test(
    a.phraseAccueil,
  );

  return (
    <div>
      <h1>Conformité</h1>
      <p className="muted">
        RGPD et règlement européen sur l'IA (AI Act) : l'essentiel est intégré à la plateforme,
        et cette page vous donne les éléments à conserver dans votre documentation.
      </p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Transparence (AI Act, article 50)</h3>
          <p className="muted">
            À partir du 2 août 2026, un agent conversationnel doit s'annoncer comme tel.
          </p>
          <p style={{ marginTop: 10 }}>
            {transparenceOk ? (
              <span className="badge ok">Conforme : votre phrase d'accueil annonce l'assistant virtuel</span>
            ) : (
              <span className="badge warn">À corriger : ajoutez « assistant virtuel » à votre phrase d'accueil</span>
            )}
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Phrase actuelle : « {a.phraseAccueil} »
          </p>
        </div>

        <div className="card">
          <h3>Conservation des appels</h3>
          <p className="muted">
            Durée de conservation des appels et transcriptions. Au-delà, ils sont supprimés
            automatiquement chaque nuit (principe de minimisation du RGPD).
          </p>
          <div style={{ marginTop: 10 }}>
            <RetentionSetting initial={a.retentionJours} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Registre des traitements (pré-rempli pour votre cabinet)</h3>
        <p className="muted">
          À reporter dans votre registre RGPD (article 30). Adaptez si nécessaire.
        </p>
        <table style={{ marginTop: 10 }}>
          <tbody>
            <tr>
              <th style={{ width: 220 }}>Responsable du traitement</th>
              <td>{a.nomCabinet} — {a.nomProfessionnel}</td>
            </tr>
            <tr>
              <th>Finalités</th>
              <td>
                Accueil téléphonique et par email, prise, report et annulation de rendez-vous,
                qualification des demandes, rappels et confirmations aux clients.
              </td>
            </tr>
            <tr>
              <th>Base légale</th>
              <td>Exécution de mesures précontractuelles et intérêt légitime (gestion des rendez-vous du cabinet).</td>
            </tr>
            <tr>
              <th>Données traitées</th>
              <td>
                Identité (nom, prénom), coordonnées (téléphone, email), motif de rendez-vous,
                transcriptions des échanges. Aucune donnée de paiement n'est conservée par la plateforme.
              </td>
            </tr>
            <tr>
              <th>Durée de conservation</th>
              <td>
                {a.retentionJours > 0
                  ? `${a.retentionJours} jours pour les appels et transcriptions (purge automatique)`
                  : "Illimitée (configurable ci-dessus) pour les appels et transcriptions"}
                ; fiches clients et rendez-vous conservés pendant la durée de la relation.
              </td>
            </tr>
            <tr>
              <th>Destinataires</th>
              <td>Le cabinet uniquement. Aucun partage commercial.</td>
            </tr>
            <tr>
              <th>Sous-traitants techniques</th>
              <td>
                Vercel (hébergement de l'application), Neon (base de données),
                Twilio (SMS, si activé), Brevo (emails, si activé), fournisseur du modèle de langage
                (traitement des conversations, si activé).
              </td>
            </tr>
            <tr>
              <th>Droits des personnes</th>
              <td>
                Accès, rectification et effacement sur demande au cabinet ; les fiches clients et
                transcriptions sont exportables (CSV, texte) et supprimables depuis le tableau de bord.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Bonnes pratiques intégrées</h3>
        <ul className="muted" style={{ paddingLeft: 18 }}>
          <li>L'IA s'annonce comme assistant virtuel et ne prétend jamais être un humain.</li>
          <li>Aucun conseil médical ou juridique : les demandes de fond sont orientées vers le professionnel.</li>
          <li>Secret professionnel : en cas de conflit d'intérêts, aucune information n'est divulguée à l'appelant.</li>
          <li>Les urgences vitales sont orientées vers le 15 ou le 112 avant tout transfert.</li>
          <li>Les envois (SMS, emails) sont journalisés dans l'onglet Messages pour traçabilité.</li>
        </ul>
      </div>
    </div>
  );
}
