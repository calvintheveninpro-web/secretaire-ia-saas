"use client";

import { useState } from "react";

export function BookingForm({
  token,
  creneaux,
  praticiens,
}: {
  token: string;
  creneaux: string[];
  praticiens: string[];
}) {
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    motif: "",
    creneau: creneaux[0] ?? "",
    praticien: "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function reserver() {
    if (!form.nom.trim() || !form.telephone.trim() || !form.creneau) {
      setErreur("Merci de renseigner au minimum votre nom, votre téléphone et un créneau.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const res = await fetch("/api/public/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...form }),
    });
    setEnvoi(false);
    if (res.ok) setConfirme(true);
    else setErreur("La réservation a échoué, réessayez ou appelez le cabinet.");
  }

  if (confirme) {
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Rendez-vous enregistré</h3>
        <p className="muted">
          Votre rendez-vous du {form.creneau} est enregistré. Vous recevrez un SMS de confirmation
          avec un lien pour annuler si besoin.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      {erreur && <p style={{ color: "var(--danger)" }}>{erreur}</p>}
      <div className="grid grid-2">
        <div>
          <label>Prénom</label>
          <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
        </div>
        <div>
          <label>Nom</label>
          <input value={form.nom} onChange={(e) => set("nom", e.target.value)} />
        </div>
        <div>
          <label>Téléphone (pour la confirmation SMS)</label>
          <input
            type="tel"
            value={form.telephone}
            placeholder="06 12 34 56 78"
            onChange={(e) => set("telephone", e.target.value)}
          />
        </div>
        <div>
          <label>Motif (en quelques mots)</label>
          <input value={form.motif} onChange={(e) => set("motif", e.target.value)} />
        </div>
        {praticiens.length > 0 && (
          <div>
            <label>Praticien (optionnel)</label>
            <select value={form.praticien} onChange={(e) => set("praticien", e.target.value)}>
              <option value="">Sans préférence</option>
              {praticiens.map((p) => (
                <option key={p} value={p.split(" — ")[0]}>{p}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label>Créneau</label>
          <select value={form.creneau} onChange={(e) => set("creneau", e.target.value)}>
            {creneaux.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={reserver} disabled={envoi}>
          {envoi ? "Enregistrement…" : "Réserver ce créneau"}
        </button>
      </div>
    </div>
  );
}
