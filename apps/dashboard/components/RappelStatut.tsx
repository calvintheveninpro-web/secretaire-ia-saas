"use client";

import { useState } from "react";

export function RappelStatut({ rappelId, statut }: { rappelId: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  const [saving, setSaving] = useState(false);

  async function changer(nouveau: string) {
    const precedent = valeur;
    setValeur(nouveau);
    setSaving(true);
    const res = await fetch(`/api/rappels/${rappelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveau }),
    });
    setSaving(false);
    if (!res.ok) setValeur(precedent);
  }

  if (valeur === "fait") return <span className="badge ok">Fait</span>;
  if (valeur === "annule") return <span className="badge warn">Annulé</span>;

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn small" disabled={saving} onClick={() => changer("fait")}>
        Marquer fait
      </button>
      <button className="btn secondary small" disabled={saving} onClick={() => changer("annule")}>
        Annuler
      </button>
    </span>
  );
}
