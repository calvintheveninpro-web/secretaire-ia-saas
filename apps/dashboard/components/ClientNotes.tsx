"use client";

import { useState } from "react";

export function ClientNotes({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | boolean>(null);

  async function save() {
    setSaving(true);
    setSaved(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setSaved(res.ok);
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Préférences, contexte, points d'attention…"
      />
      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn small" onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer les notes"}
        </button>
        {saved === true && <span className="badge ok">Enregistré</span>}
        {saved === false && <span className="badge warn">Erreur</span>}
      </div>
    </div>
  );
}
