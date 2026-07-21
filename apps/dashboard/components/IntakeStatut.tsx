"use client";

import { useState } from "react";

const STATUTS: { value: string; label: string }[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "rdv_pris", label: "RDV pris" },
  { value: "converti", label: "Converti" },
  { value: "perdu", label: "Perdu" },
];

export function IntakeStatut({ intakeId, statut }: { intakeId: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  const [saving, setSaving] = useState(false);

  async function changer(nouveau: string) {
    const precedent = valeur;
    setValeur(nouveau);
    setSaving(true);
    const res = await fetch(`/api/intakes/${intakeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveau }),
    });
    setSaving(false);
    if (!res.ok) setValeur(precedent);
  }

  return (
    <select
      value={valeur}
      disabled={saving}
      onChange={(e) => changer(e.target.value)}
      style={{ width: "auto", padding: "6px 8px", fontSize: 13 }}
    >
      {STATUTS.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
