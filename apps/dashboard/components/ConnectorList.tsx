"use client";

import { useState } from "react";

type EtatConnecteur = { actif: boolean; config?: string; connecteLe?: string };

const CATALOGUE: {
  id: string;
  nom: string;
  description: string;
  configLabel?: string;
  configPlaceholder?: string;
}[] = [
  {
    id: "google_calendar",
    nom: "Google Calendar",
    description: "Synchronise les rendez-vous pris par l'IA avec votre agenda Google, dans les deux sens.",
    configLabel: "Adresse email du calendrier",
    configPlaceholder: "cabinet@gmail.com",
  },
  {
    id: "outlook",
    nom: "Outlook / Microsoft 365",
    description: "Ajoute automatiquement les rendez-vous dans votre calendrier Outlook.",
    configLabel: "Adresse email du compte",
    configPlaceholder: "cabinet@outlook.com",
  },
  {
    id: "doctolib",
    nom: "Doctolib",
    description: "Aligne les créneaux et les rendez-vous avec votre agenda Doctolib.",
    configLabel: "Identifiant du cabinet Doctolib",
    configPlaceholder: "cabinet-dr-martin",
  },
  {
    id: "twilio",
    nom: "Twilio (téléphonie)",
    description: "Fournit le numéro entrant de la secrétaire IA et le transfert d'appel vers un humain.",
    configLabel: "Numéro Twilio",
    configPlaceholder: "+33 9 00 00 00 00",
  },
  {
    id: "brevo",
    nom: "Brevo (email et SMS)",
    description: "Envoie les confirmations, rappels et annulations de rendez-vous par SMS et par email.",
    configLabel: "Email d'expéditeur",
    configPlaceholder: "contact@cabinet.fr",
  },
  {
    id: "slack",
    nom: "Slack",
    description: "Notifie votre équipe en temps réel : nouvel appel, rendez-vous pris, message urgent.",
    configLabel: "Canal Slack",
    configPlaceholder: "#secretariat",
  },
  {
    id: "webhook",
    nom: "Make / n8n (webhook)",
    description: "Déclenche vos propres automatisations à chaque événement (appel, rendez-vous, message).",
    configLabel: "URL du webhook",
    configPlaceholder: "https://hook.make.com/...",
  },
];

export function ConnectorList({ initial }: { initial: Record<string, EtatConnecteur> }) {
  const [etat, setEtat] = useState<Record<string, EtatConnecteur>>(initial);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function persist(suivant: Record<string, EtatConnecteur>, id: string) {
    setEnCours(id);
    setErreur(null);
    const res = await fetch("/api/connectors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connecteurs: suivant }),
    });
    setEnCours(null);
    if (!res.ok) setErreur("L'enregistrement a échoué, réessayez.");
    else setEtat(suivant);
  }

  function basculer(id: string) {
    const actuel = etat[id] ?? { actif: false };
    const suivant = {
      ...etat,
      [id]: {
        ...actuel,
        actif: !actuel.actif,
        connecteLe: !actuel.actif ? new Date().toISOString() : actuel.connecteLe,
      },
    };
    void persist(suivant, id);
  }

  function changerConfig(id: string, config: string) {
    setEtat((e) => ({ ...e, [id]: { ...(e[id] ?? { actif: false }), config } }));
  }

  function enregistrerConfig(id: string) {
    void persist(etat, id);
  }

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      {erreur && <p style={{ color: "var(--danger)" }}>{erreur}</p>}
      {CATALOGUE.map((c) => {
        const e = etat[c.id] ?? { actif: false };
        return (
          <div className="card connector" key={c.id}>
            <div className="infos">
              <h3 style={{ margin: 0 }}>
                {c.nom}{" "}
                {e.actif ? (
                  <span className="badge ok" style={{ marginLeft: 8 }}>Connecté</span>
                ) : (
                  <span className="badge info" style={{ marginLeft: 8 }}>Non connecté</span>
                )}
              </h3>
              <p className="muted" style={{ marginTop: 6 }}>{c.description}</p>
              {e.actif && c.configLabel && (
                <div style={{ maxWidth: 420 }}>
                  <label>{c.configLabel}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={e.config ?? ""}
                      placeholder={c.configPlaceholder}
                      onChange={(ev) => changerConfig(c.id, ev.target.value)}
                    />
                    <button
                      className="btn secondary small"
                      onClick={() => enregistrerConfig(c.id)}
                      disabled={enCours === c.id}
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}
              {e.actif && e.connecteLe && (
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Connecté le {new Date(e.connecteLe).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            <button
              className={`btn ${e.actif ? "secondary" : ""}`}
              onClick={() => basculer(c.id)}
              disabled={enCours === c.id}
            >
              {enCours === c.id ? "Patientez…" : e.actif ? "Déconnecter" : "Connecter"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
