"use client";

import { useState } from "react";

export function BookingConfig({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);

  const iframe = url
    ? `<iframe src="${url}" style="width:100%;min-height:640px;border:1px solid #d8dce2"></iframe>`
    : "";

  async function generer() {
    setLoading(true);
    const res = await fetch("/api/booking/token", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setUrl(data.url);
    }
  }

  async function copier(texte: string, quoi: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(quoi);
      setTimeout(() => setCopie(null), 1500);
    } catch {
      // La sélection manuelle reste possible.
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Réservation en ligne</h3>
      <p className="muted">
        Une page publique de prise de rendez-vous aux couleurs de votre cabinet : partagez le lien
        (site, email, réseaux) ou intégrez le widget directement sur votre site.
      </p>
      {url ? (
        <div style={{ marginTop: 10 }}>
          <label>Lien de votre page de réservation</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input readOnly value={url} style={{ flex: 1, minWidth: 260, fontSize: 13 }} onFocus={(e) => e.target.select()} />
            <button className="btn secondary small" onClick={() => copier(url, "lien")}>
              {copie === "lien" ? "Copié" : "Copier le lien"}
            </button>
            <a className="btn secondary small" href={url} target="_blank" rel="noreferrer">
              Ouvrir
            </a>
          </div>
          <label>Widget à intégrer sur votre site (copier-coller)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input readOnly value={iframe} style={{ flex: 1, minWidth: 260, fontSize: 12 }} onFocus={(e) => e.target.select()} />
            <button className="btn secondary small" onClick={() => copier(iframe, "widget")}>
              {copie === "widget" ? "Copié" : "Copier le widget"}
            </button>
          </div>
          <button className="btn secondary small" style={{ marginTop: 10 }} onClick={generer} disabled={loading}>
            {loading ? "Patientez…" : "Régénérer le lien"}
          </button>
        </div>
      ) : (
        <button className="btn small" style={{ marginTop: 10 }} onClick={generer} disabled={loading}>
          {loading ? "Patientez…" : "Activer la réservation en ligne"}
        </button>
      )}
    </div>
  );
}
