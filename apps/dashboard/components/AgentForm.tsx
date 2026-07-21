"use client";

import { useState } from "react";

export function AgentForm({ initial }: { initial: any }) {
  const [form, setForm] = useState({
    ...initial,
    faqText: Object.entries(initial.faqCabinet ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  });
  const [specialites, setSpecialites] = useState<string[]>(
    String(initial.specialite ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  );
  const [nouvelleSpecialite, setNouvelleSpecialite] = useState("");
  const [domaines, setDomaines] = useState<string[]>(
    String(initial.domainesDroit ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  );
  const [nouveauDomaine, setNouveauDomaine] = useState("");
  const [saved, setSaved] = useState<null | boolean>(null);
  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function ajouterSpecialite() {
    const s = nouvelleSpecialite.trim();
    if (!s || specialites.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    setSpecialites((list) => [...list, s]);
    setNouvelleSpecialite("");
  }

  function retirerSpecialite(s: string) {
    setSpecialites((list) => list.filter((x) => x !== s));
  }

  function ajouterDomaine() {
    const d = nouveauDomaine.trim();
    if (!d || domaines.some((x) => x.toLowerCase() === d.toLowerCase())) return;
    setDomaines((list) => [...list, d]);
    setNouveauDomaine("");
  }

  function retirerDomaine(d: string) {
    setDomaines((list) => list.filter((x) => x !== d));
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
      body: JSON.stringify({
        ...form,
        specialite: specialites.join(", "),
        domainesDroit: domaines.join(", "),
        faqCabinet,
      }),
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
          <label>Spécialités (vous pouvez en ajouter plusieurs)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={nouvelleSpecialite}
              placeholder="Ex. : Médecine générale"
              onChange={(e) => setNouvelleSpecialite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterSpecialite();
                }
              }}
            />
            <button className="btn secondary" type="button" onClick={ajouterSpecialite}>
              Ajouter
            </button>
          </div>
          {specialites.length > 0 && (
            <div className="tags">
              {specialites.map((s) => (
                <span className="tag" key={s}>
                  {s}
                  <button type="button" onClick={() => retirerSpecialite(s)} aria-label={`Retirer ${s}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
        <div>
          <label>Email de notification du cabinet</label>
          <input
            type="email"
            value={form.emailNotification ?? ""}
            placeholder="cabinet@exemple.fr"
            onChange={(e) => set("emailNotification", e.target.value)}
          />
        </div>
        <div>
          <label>État de l'agent</label>
          <select
            value={form.actif ? "actif" : "pause"}
            onChange={(e) => set("actif", e.target.value === "actif")}
          >
            <option value="actif">Actif (l'IA décroche les appels)</option>
            <option value="pause">En pause (l'IA ne répond plus)</option>
          </select>
        </div>
        <div>
          <label>Durée d'un rendez-vous (minutes)</label>
          <input
            type="number"
            min={5}
            step={5}
            value={form.dureeRdvParDefautMin ?? 30}
            onChange={(e) => set("dureeRdvParDefautMin", Number(e.target.value))}
          />
        </div>
        <div>
          <label>Délai minimum avant un rendez-vous (heures)</label>
          <input
            type="number"
            min={0}
            value={form.delaiMinAvantRdvHeures ?? 24}
            onChange={(e) => set("delaiMinAvantRdvHeures", Number(e.target.value))}
          />
        </div>
      </div>

      {form.metier === "avocat" && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 4 }}>
          <h3 style={{ marginBottom: 0 }}>Réglages du cabinet d'avocats</h3>
          <div className="grid grid-2">
            <div>
              <label>Domaines de droit pratiqués (vous pouvez en ajouter plusieurs)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={nouveauDomaine}
                  placeholder="Ex. : Droit du travail"
                  onChange={(e) => setNouveauDomaine(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      ajouterDomaine();
                    }
                  }}
                />
                <button className="btn secondary" type="button" onClick={ajouterDomaine}>
                  Ajouter
                </button>
              </div>
              {domaines.length > 0 && (
                <div className="tags">
                  {domaines.map((d) => (
                    <span className="tag" key={d}>
                      {d}
                      <button type="button" onClick={() => retirerDomaine(d)} aria-label={`Retirer ${d}`}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                L'IA oriente les appels selon ces domaines et classe « hors périmètre » les demandes
                que le cabinet ne traite pas.
              </p>
            </div>
            <div>
              <label>Première consultation payante</label>
              <select
                value={form.consultationPayante ? "oui" : "non"}
                onChange={(e) => set("consultationPayante", e.target.value === "oui")}
              >
                <option value="non">Non — rendez-vous confirmé sans paiement</option>
                <option value="oui">Oui — lien de paiement envoyé par SMS</option>
              </select>
              {form.consultationPayante && (
                <div>
                  <label>Montant de la consultation (euros)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.montantConsultationEur ?? ""}
                    placeholder="Ex. : 90"
                    onChange={(e) => set("montantConsultationEur", Number(e.target.value))}
                  />
                  <label>Lien de paiement Stripe (Payment Link)</label>
                  <input
                    value={form.lienPaiement ?? ""}
                    placeholder="https://buy.stripe.com/..."
                    onChange={(e) => set("lienPaiement", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <label>Phrase d'accueil</label>
      <textarea value={form.phraseAccueil ?? ""} onChange={(e) => set("phraseAccueil", e.target.value)} />

      <label>FAQ du cabinet (une ligne par entrée : clé: valeur)</label>
      <textarea value={form.faqText ?? ""} onChange={(e) => set("faqText", e.target.value)} />

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved === true && <span className="badge ok">Enregistré</span>}
        {saved === false && <span className="badge warn">Erreur</span>}
      </div>
    </div>
  );
}
