// Génération du brouillon de réponse à un email entrant.
// Avec OPENAI_API_KEY (même fournisseur que le moteur vocal), le brouillon est
// rédigé par le LLM à partir des informations du cabinet. Sans clé, un modèle
// de réponse structuré est proposé — toujours validé par le cabinet avant envoi.

import type { Agent } from "@prisma/client";

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

function safeJson(s: string): Record<string, string> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Trois créneaux indicatifs dans les prochains jours ouvrés. */
function prochainsCreneaux(): string[] {
  const out: string[] = [];
  const heures = ["9h30", "14h30", "16h00"];
  const d = new Date();
  let ajoutes = 0;
  for (let i = 1; ajoutes < 3 && i < 10; i++) {
    const jour = new Date(d.getTime() + i * 86400000);
    const dow = jour.getDay();
    if (dow === 0 || dow === 6) continue;
    out.push(
      `${jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${heures[ajoutes]}`,
    );
    ajoutes++;
  }
  return out;
}

export async function genererBrouillon(
  agent: Agent,
  deEmail: string,
  objet: string,
  contenu: string,
): Promise<string> {
  if (OPENAI_KEY) {
    try {
      const brouillon = await brouillonLlm(agent, objet, contenu);
      if (brouillon) return brouillon;
    } catch {
      // En cas d'échec du LLM, on retombe sur le modèle structuré.
    }
  }
  return brouillonModele(agent);
}

async function brouillonLlm(agent: Agent, objet: string, contenu: string): Promise<string> {
  const faq = Object.entries(safeJson(agent.faqJson))
    .map(([k, v]) => `- ${k} : ${v}`)
    .join("\n");
  const system = [
    `Tu es l'assistant du cabinet « ${agent.nomCabinet} » (${agent.nomProfessionnel}${agent.specialite ? `, ${agent.specialite}` : ""}).`,
    `Tu rédiges un BROUILLON de réponse à un email reçu par le cabinet. Le cabinet le relira avant envoi.`,
    `Règles : réponds en français, ton professionnel et chaleureux, phrases courtes.`,
    `Ne donne jamais de conseil médical ou juridique : propose un rendez-vous pour cela.`,
    `Si la demande concerne un rendez-vous, propose ces créneaux : ${prochainsCreneaux().join(" ; ")}.`,
    `Informations du cabinet : adresse ${agent.adresse ?? "non renseignée"} ; horaires ${agent.horairesOuverture}.`,
    faq ? `FAQ du cabinet :\n${faq}` : "",
    `Signe « L'assistant du cabinet ${agent.nomCabinet} ».`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Objet : ${objet}\n\n${contenu}` },
      ],
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function brouillonModele(agent: Agent): string {
  const creneaux = prochainsCreneaux();
  return [
    `Bonjour,`,
    ``,
    `Merci pour votre message. Nous pouvons vous proposer un rendez-vous sur l'un des créneaux suivants :`,
    ...creneaux.map((c) => `- ${c}`),
    ``,
    `Dites-nous celui qui vous convient et nous le confirmerons aussitôt.`,
    `Pour rappel, le cabinet est ouvert ${agent.horairesOuverture.toLowerCase()}${agent.adresse ? `, au ${agent.adresse}` : ""}.`,
    ``,
    `Bien cordialement,`,
    `L'assistant du cabinet ${agent.nomCabinet}`,
  ].join("\n");
}
