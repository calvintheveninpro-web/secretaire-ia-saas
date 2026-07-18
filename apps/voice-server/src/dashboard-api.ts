// Pont entre le moteur vocal et le tableau de bord :
// - résoudre quel cabinet (agent) correspond au numéro appelé
// - exécuter les tools (RDV, notifications...) côté dashboard
// - enregistrer le compte-rendu d'appel
// En cas d'indisponibilité du dashboard, on retombe sur un comportement mock local.

import { config } from "./config.js";
import type { AgentConfig, CallRecord, ToolCall, ToolResult } from "@secretaire-ia/shared";

const DEFAULT_AGENT: AgentConfig = {
  id: "demo-agent",
  tenantId: "demo-tenant",
  nomCabinet: "Cabinet du Dr Martin",
  metier: "medecin",
  nomProfessionnel: "Dr Sophie Martin",
  specialite: "Médecine générale",
  adresse: "12 rue de la Paix, 75002 Paris",
  horairesOuverture: "Du lundi au vendredi, de 9h à 19h",
  dureeRdvParDefautMin: 30,
  delaiMinAvantRdvHeures: 24,
  numeroTransfertHumain: "+33100000000",
  emailNotification: "cabinet@exemple.fr",
  langue: "fr-FR",
  phraseAccueil: "Cabinet du Dr Martin, bonjour ! Je suis l'assistant virtuel du cabinet. Comment puis-je vous aider ?",
  faqCabinet: { tarifs: "Consultation 30 €, secteur 1", parking: "Parking public à 100 m" },
  numeroEntrant: "+33900000000",
  actif: true,
};

export async function fetchAgentByNumber(toNumber: string): Promise<AgentConfig> {
  try {
    const res = await fetch(`${config.dashboardApiUrl}/api/agent?number=${encodeURIComponent(toNumber)}`);
    if (res.ok) return (await res.json()) as AgentConfig;
  } catch {
    /* dashboard non démarré : fallback démo */
  }
  return DEFAULT_AGENT;
}

export async function executeTool(tenantId: string, callSid: string, tool: ToolCall): Promise<ToolResult> {
  try {
    const res = await fetch(`${config.dashboardApiUrl}/api/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, callSid, tool }),
    });
    if (res.ok) return (await res.json()) as ToolResult;
  } catch {
    /* fallback local ci-dessous */
  }
  return mockToolResult(tool);
}

export async function saveCall(record: Partial<CallRecord>): Promise<void> {
  try {
    await fetch(`${config.dashboardApiUrl}/api/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    console.log("[dashboard-api:mock] Appel enregistré localement:", record.outcome);
  }
}

function mockToolResult(tool: ToolCall): ToolResult {
  switch (tool.name) {
    case "check_availability":
      return { ok: true, data: { creneaux: ["mardi 14:30", "jeudi 10:00", "vendredi 16:15"] } };
    case "book_appointment":
      return { ok: true, data: { rdvId: "mock-" + Math.floor(Date.now() / 1000), confirme: true } };
    default:
      return { ok: true, data: {} };
  }
}
