"use client";

import { useState } from "react";

export function CancelButton({ rdvId, t }: { rdvId: string; t: string }) {
  const [etat, setEtat] = useState<"initial" | "confirmation" | "annule">("initial");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function annuler() {
    setEnvoi(true);
    setErreur(null);
    const res = await fetch("/api/public/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rdvId, t }),
    });
    setEnvoi(false);
    if (res.ok) setEtat("annule");
    else setErreur("L'annulation a échoué, réessayez ou contactez le cabinet.");
  }

  if (etat === "annule") {
    return <p className="badge ok" style={{ marginTop: 8 }}>Votre rendez-vous a bien été annulé.</p>;
  }

  if (etat === "confirmation") {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>Confirmer l'annulation ?</span>
        <button className="btn" onClick={annuler} disabled={envoi}>
          {envoi ? "Annulation…" : "Oui, annuler"}
        </button>
        <button className="btn secondary" onClick={() => setEtat("initial")} disabled={envoi}>
          Non, garder
        </button>
        {erreur && <span style={{ color: "var(--danger)" }}>{erreur}</span>}
      </div>
    );
  }

  return (
    <button className="btn secondary" onClick={() => setEtat("confirmation")}>
      Annuler mon rendez-vous
    </button>
  );
}
