"use client";

import { useState } from "react";

export function EmailWebhookConfig({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [copie, setCopie] = useState(false);

  async function generer() {
    setLoading(true);
    const res = await fetch("/api/email/token", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setUrl(data.webhookUrl);
    }
  }

  async function copier() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // La sélection manuelle reste possible.
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Connexion de votre boîte email</h3>
      <p className="muted">
        Configurez cette adresse de webhook chez votre fournisseur d'emails entrants
        (Brevo Inbound, Mailgun, Make, n8n...) pour que la secrétaire IA reçoive les messages du cabinet.
      </p>
      {url ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input readOnly value={url} style={{ flex: 1, minWidth: 260, fontSize: 13 }} onFocus={(e) => e.target.select()} />
          <button className="btn secondary small" onClick={copier}>
            {copie ? "Copié" : "Copier"}
          </button>
          <button className="btn secondary small" onClick={generer} disabled={loading}>
            {loading ? "Patientez…" : "Régénérer le jeton"}
          </button>
        </div>
      ) : (
        <button className="btn small" style={{ marginTop: 10 }} onClick={generer} disabled={loading}>
          {loading ? "Patientez…" : "Activer la réception d'emails"}
        </button>
      )}
    </div>
  );
}
