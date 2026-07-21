"use client";

import { useState } from "react";

const DUREES: { value: number; label: string }[] = [
  { value: 0, label: "Conservation illimitée" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 180, label: "6 mois" },
  { value: 365, label: "1 an" },
  { value: 730, label: "2 ans" },
];

export function RetentionSetting({ initial }: { initial: number }) {
  const [valeur, setValeur] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | boolean>(null);

  async function changer(nouvelle: number) {
    const precedente = valeur;
    setValeur(nouvelle);
    setSaving(true);
    setSaved(null);
    const res = await fetch("/api/compliance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retentionJours: nouvelle }),
    });
    setSaving(false);
    setSaved(res.ok);
    if (!res.ok) setValeur(precedente);
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <select
        value={valeur}
        disabled={saving}
        style={{ width: "auto" }}
        onChange={(e) => changer(Number(e.target.value))}
      >
        {DUREES.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
      {saved === true && <span className="badge ok">Enregistré</span>}
      {saved === false && <span className="badge warn">Erreur</span>}
    </div>
  );
}
