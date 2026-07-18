"use client";

import { useState } from "react";

export function AgentForm({ initial }: { initial: any }) {
  const [form, setForm] = useState({
    ...initial,
    faqText: Object.entries(initial.faqCabinet ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  });
  const [saved, setSaved] = useState<null | boolean>(null);
  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    const faqCabinet: Record<string, string> = {};
    String(form.faqText || "")
      .split("\n")
      .forEach((line) => {
        const i = line.indexOf(":");
        if (i > 0) faqCabinet[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
    const res = await fetch("/api/agent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, faqCabinet }),
    });
    setSaving(false);
    setSaved(res.ok);
  }

  return (
    <div className="card">
      <div className="grid grid-2">
        <div>
          <label>Nom du cabinet</label>
          <input value={form.nomCabinet ?? ""} onChange={(e) => set("nomCabinet", e.target.value)} />
        </div>
        <div>
          <label>Métier</label>
          <select value={form.metier} onChange={(e) => set("metier", e.target.value)}>
            <option value="medecin">Médecin</option>
            <option value="chirurgien">Chirurgien</option>
            <option value="avocat">Avocat</option>
            <option value="entrepreneur">Entrepreneur</option>
          </select>
        </div>
        <div>
          <label>Professionnel</label>
          <input value={form.nomProfessionnel ?? ""} onChange={(e) => set("nomProfessionnel", e.target.value)} />
        </div>
        <div>
          <label>Spécialité</label>
          <input value={form.specialite ?? ""} onChange={(e) => set("specialite", e.target.value)} />
        </div>
        <div>
          <label>Adresse</label>
          <input value={form.adresse ?? ""} onChange={(e) => set("adresse", e.target.value)} />
        </div>
        <div>
          <label>Horaires d'ouverture</label>
          <input value={form.horairesOuverture ?? ""} onChange={(e) => set("horairesOuverture", e.target.value)} />
        </div>
        <div>
          <label>Numéro de transfert (humain)</label>
          <input value={form.numeroTransfertHumain ?? ""} onChange={(e) => set("numeroTransfertHumain", e.target.value)} />
        </div>
        <div>
          <label>Numéro entrant (Twilio)</label>
          <input value={form.numeroEntrant ?? ""} onChange={(e) => set("numeroEntrant", e.target.value)} />
        </div>
      </div>

      <label>Phrase d'accueil</label>
      <textarea value={form.phraseAccueil ?? ""} onChange={(e) => set("phraseAccueil", e.target.value)} />

      <label>FAQ du cabinet (une ligne par entrée : clé: valeur)</label>
      <textarea value={form.faqText ?? ""} onChange={(e) => set("faqText", e.target.value)} />

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved === true && <span className="badge ok">Enregistré ✓</span>}
        {saved === false && <span className="badge warn">Erreur</span>}
      </div>
    </div>
  );
}
