#!/usr/bin/env node
// Démonstration hors-ligne du moteur vocal — SANS aucune dépendance ni clé API.
//
//   node demo/simulate-call.mjs              -> scénario médecin (prise de RDV)
//   node demo/simulate-call.mjs avocat       -> scénario avocat
//   node demo/simulate-call.mjs medecin urgence  -> scénario urgence (transfert)
//
// Ce script rejoue une conversation téléphonique en utilisant le VRAI prompt JSON
// (prompt/secretaire-ia-prompt.json) et des fournisseurs "mock" (reconnaissance vocale,
// LLM, synthèse). Il illustre la boucle : parole client -> IA -> exécution des tools.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const prompt = JSON.parse(
  readFileSync(fileURLToPath(new URL("../prompt/secretaire-ia-prompt.json", import.meta.url)), "utf8"),
);

const metier = process.argv[2] ?? "medecin";
const scenario = process.argv[3] ?? "rdv";
const variante = prompt.variantes_metier?.[metier] ?? {};

const cabinet = {
  nomCabinet: "Cabinet du Dr Martin",
  nomProfessionnel: metier === "avocat" ? "Sophie Martin" : "Dr Sophie Martin",
};

const accueil = (variante.phrase_accueil ?? prompt.variables_client.phrase_accueil)
  .replaceAll("{{nom_professionnel}}", cabinet.nomProfessionnel)
  .replaceAll("{{nom_cabinet}}", cabinet.nomCabinet);

// --- Fournisseurs mock (ce que ferait le vrai moteur, en version scriptée) ---
const tools = {
  check_availability: () => ({ ok: true, data: { creneaux: ["mardi 14h30", "jeudi 10h00"] } }),
  book_appointment: (a) => ({ ok: true, data: { rdvId: "RDV-8241", confirme: true, quand: a.date_heure } }),
  send_confirmation: () => ({ ok: true, data: { sms: "envoyé" } }),
  transfer_call: () => ({ ok: true, data: { transfere: true } }),
  end_call: () => ({ ok: true, data: {} }),
};

// --- Scénarios (ce que dit l'appelant) ---
const scripts = {
  rdv: [
    "Bonjour, je voudrais prendre un rendez-vous.",
    "Oui, c'est Marie Dupont.",
    "Je suis déjà patiente du cabinet.",
    "C'est pour un renouvellement d'ordonnance.",
    "Mardi 14h30, c'est parfait.",
    "Non, c'est tout, merci beaucoup !",
  ],
  urgence: [
    "Bonjour, j'ai une douleur très forte à la poitrine, c'est urgent !",
  ],
};

// --- "LLM" mock : décide de la réponse + des tools selon le tour ---
function agentTurn(step, callerText) {
  const t = callerText.toLowerCase();
  if (/urgen|douleur|malaise|poitrine|respir|sang/.test(t)) {
    return {
      text:
        (metier === "medecin" || metier === "chirurgien"
          ? "Je comprends. Si c'est une urgence vitale, raccrochez et appelez le 15 ou le 112 immédiatement. "
          : "") + "Je vous mets en relation avec le cabinet tout de suite, ne quittez pas.",
      tool: { name: "transfer_call", args: { numero_destination: "+33100000000" } },
    };
  }
  return [
    { text: "Avec plaisir. Puis-je avoir votre nom et prénom, s'il vous plaît ?" },
    { text: "Merci. Êtes-vous déjà patient(e) du cabinet ou est-ce un premier rendez-vous ?" },
    { text: "Très bien. Pouvez-vous me préciser le motif du rendez-vous ?" },
    {
      text: "Un instant, je consulte les disponibilités…",
      tool: { name: "check_availability", args: { date_debut: "demain", date_fin: "+7j" } },
      then: "Je vous propose mardi 14h30 ou jeudi 10h. Quel créneau préférez-vous ?",
    },
    {
      text: "Parfait, je confirme votre rendez-vous.",
      tool: { name: "book_appointment", args: { nom: "Dupont", prenom: "Marie", date_heure: "mardi 14h30", motif: "renouvellement d'ordonnance" } },
      then: "C'est enregistré. Vous allez recevoir une confirmation par SMS.",
      also: { name: "send_confirmation", args: { telephone: "+33612345678" } },
    },
    { text: "Avec plaisir, très bonne journée !", tool: { name: "end_call", args: {} } },
  ][step] ?? { text: "Très bonne journée !", tool: { name: "end_call", args: {} } };
}

// --- Boucle de conversation ---
function line(who, text) {
  const tag = who === "agent" ? "🤖 IA   " : who === "caller" ? "📞 Client" : "⚙️  Tool ";
  console.log(`${tag} │ ${text}`);
}

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log(`║  SIMULATION D'APPEL — métier: ${metier.padEnd(12)} scénario: ${scenario.padEnd(8)} ║`);
console.log("╚══════════════════════════════════════════════════════════════╝\n");

line("agent", accueil);

const script = scripts[scenario] ?? scripts.rdv;
let outcome = "info";

for (let i = 0; i < script.length; i++) {
  line("caller", script[i]);
  const turn = agentTurn(i, script[i]);
  line("agent", turn.text);

  for (const call of [turn.tool, turn.also].filter(Boolean)) {
    const res = tools[call.name]?.(call.args) ?? { ok: true };
    line("tool", `${call.name}(${JSON.stringify(call.args)}) -> ${JSON.stringify(res.data ?? res)}`);
    if (call.name === "book_appointment") outcome = "rdv_pris";
    if (call.name === "transfer_call") outcome = "transfere";
  }
  if (turn.then) line("agent", turn.then);
  if (turn.tool?.name === "transfer_call" || turn.tool?.name === "end_call") break;
}

console.log("\n────────────────────────────────────────────────────────────────");
console.log(`Résultat de l'appel : ${outcome.toUpperCase()}`);
console.log("Compte-rendu enregistré (dans le vrai moteur : POST /api/calls).\n");
