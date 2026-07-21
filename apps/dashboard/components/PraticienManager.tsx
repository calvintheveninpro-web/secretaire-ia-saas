"use client";

import { useState } from "react";

type Praticien = { id: string; nom: string; specialites: string | null; actif: boolean };

export function PraticienManager({ initial }: { initial: Praticien[] }) {
  const [praticiens, setPraticiens] = useState(initial);
  const [nom, setNom] = useState("");
  const [specialites, setSpecialites] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter() {
    if (!nom.trim()) return;
    setEnCours(true);
    setErreur(null);
    const res = await fetch("/api/praticiens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, specialites }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("L'ajout a échoué, réessayez.");
      return;
    }
    const data = await res.json();
    setPraticiens((list) => [...list, data.praticien]);
    setNom("");
    setSpecialites("");
  }

  async function basculer(p: Praticien) {
    const res = await fetch(`/api/praticiens/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !p.actif }),
    });
    if (res.ok) {
      setPraticiens((list) =>
        list.map((x) => (x.id === p.id ? { ...x, actif: !p.actif } : x)),
      );
    }
  }

  async function retirer(p: Praticien) {
    const res = await fetch(`/api/praticiens/${p.id}`, { method: "DELETE" });
    if (res.ok) setPraticiens((list) => list.filter((x) => x.id !== p.id));
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Praticiens du cabinet</h3>
      <p className="muted">
        Ajoutez les praticiens et leurs domaines : l'IA oriente chaque appelant vers le bon
        praticien et enregistre le rendez-vous à son nom.
      </p>

      <table style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Praticien</th>
            <th>Domaines ou spécialités</th>
            <th>État</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {praticiens.map((p) => (
            <tr key={p.id}>
              <td><strong>{p.nom}</strong></td>
              <td>{p.specialites || "—"}</td>
              <td>
                <span className={`badge ${p.actif ? "ok" : "warn"}`}>
                  {p.actif ? "Disponible" : "Indisponible"}
                </span>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn secondary small" onClick={() => basculer(p)}>
                  {p.actif ? "Rendre indisponible" : "Rendre disponible"}
                </button>{" "}
                <button className="btn secondary small" onClick={() => retirer(p)}>
                  Retirer
                </button>
              </td>
            </tr>
          ))}
          {praticiens.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                Aucun praticien pour l'instant : l'IA prend les rendez-vous au nom du professionnel principal.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div>
          <label>Nom du praticien</label>
          <input value={nom} placeholder="Ex. : Maître Paul Durand" onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label>Domaines ou spécialités (optionnel)</label>
          <input
            value={specialites}
            placeholder="Ex. : Droit pénal, Droit routier"
            onChange={(e) => setSpecialites(e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn small" onClick={ajouter} disabled={enCours || !nom.trim()}>
          {enCours ? "Ajout…" : "Ajouter le praticien"}
        </button>
        {erreur && <span style={{ color: "var(--danger)" }}>{erreur}</span>}
      </div>
    </div>
  );
}
