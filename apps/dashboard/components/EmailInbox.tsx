"use client";

import { useState } from "react";

type Email = {
  id: string;
  deEmail: string;
  objet: string;
  contenu: string;
  brouillon: string;
  statut: string;
  createdAt: string;
};

const STATUT_LABEL: Record<string, string> = {
  nouveau: "À traiter",
  repondu: "Répondu",
  ignore: "Ignoré",
};

export function EmailInbox({ initial }: { initial: Email[] }) {
  const [emails, setEmails] = useState(initial);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function setLocal(id: string, patch: Partial<Email>) {
    setEmails((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function action(id: string, body: Record<string, string>) {
    setEnCours(id);
    setErreur(null);
    const res = await fetch(`/api/emails/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEnCours(null);
    if (!res.ok) {
      setErreur("L'action a échoué, réessayez.");
      return false;
    }
    return true;
  }

  async function envoyer(email: Email) {
    if (await action(email.id, { action: "envoyer", reponse: email.brouillon })) {
      setLocal(email.id, { statut: "repondu" });
    }
  }

  async function ignorer(email: Email) {
    if (await action(email.id, { action: "ignorer" })) {
      setLocal(email.id, { statut: "ignore" });
    }
  }

  async function enregistrerBrouillon(email: Email) {
    await action(email.id, { action: "brouillon", reponse: email.brouillon });
  }

  if (emails.length === 0) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <p className="muted">
          Aucun email pour l'instant. Dès que la réception sera branchée, les messages et leurs
          brouillons de réponse apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      {erreur && <p style={{ color: "var(--danger)" }}>{erreur}</p>}
      {emails.map((e) => (
        <div className="card" key={e.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{e.objet}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                De {e.deEmail} · {new Date(e.createdAt).toLocaleString("fr-FR")}
              </div>
            </div>
            <span className={`badge ${e.statut === "repondu" ? "ok" : e.statut === "ignore" ? "warn" : "info"}`}>
              {STATUT_LABEL[e.statut] ?? e.statut}
            </span>
          </div>

          <p style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{e.contenu}</p>

          {e.statut === "nouveau" && (
            <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <label>Brouillon de réponse proposé par l'IA (modifiable)</label>
              <textarea
                value={e.brouillon}
                style={{ minHeight: 140 }}
                onChange={(ev) => setLocal(e.id, { brouillon: ev.target.value })}
                onBlur={() => enregistrerBrouillon(e)}
              />
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button className="btn" onClick={() => envoyer(e)} disabled={enCours === e.id}>
                  {enCours === e.id ? "Envoi…" : "Valider et envoyer"}
                </button>
                <button className="btn secondary" onClick={() => ignorer(e)} disabled={enCours === e.id}>
                  Ignorer
                </button>
              </div>
            </div>
          )}
          {e.statut === "repondu" && e.brouillon && (
            <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <label>Réponse envoyée</label>
              <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{e.brouillon}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
