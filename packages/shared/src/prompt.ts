// Construit le prompt système de l'agent à partir du fichier JSON (prompt/secretaire-ia-prompt.json)
// et de la configuration d'un cabinet (AgentConfig).

import type { AgentConfig, Metier } from "./types.js";

type PromptJson = Record<string, any>;

/**
 * Remplit le prompt JSON avec les variables du cabinet et la variante métier,
 * et retourne un prompt système prêt à être envoyé au LLM.
 */
export function buildSystemPrompt(config: AgentConfig, promptJson: PromptJson): string {
  const variante = promptJson.variantes_metier?.[config.metier] ?? {};
  const identite = promptJson.identite_agent ?? {};
  const regles: string[] = identite.regles_de_langage ?? [];
  const gardeFous: string[] = promptJson.garde_fous ?? [];
  const deroule = promptJson.deroule_conversation ?? {};
  const urgences = promptJson.gestion_urgences ?? {};
  const annulation = promptJson.gestion_annulation_report ?? {};
  const horsHoraires = promptJson.comportement_hors_horaires ?? {};

  const faq = config.faqCabinet ?? {};
  const faqLignes = Object.entries(faq)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => `- ${k} : ${v}`)
    .join("\n");

  const phraseAccueil = fill(config.phraseAccueil || variante.phrase_accueil || "", config);
  const questionsSpecifiques: string[] = variante.questions_specifiques ?? [];

  return [
    `# RÔLE`,
    fill(identite.role ?? "", config),
    ``,
    `# OBJECTIF`,
    identite.objectif_principal ?? "",
    ``,
    `# PERSONNALITÉ ET TON`,
    `${identite.personnalite ?? ""} Ton attendu : ${variante.ton_de_voix ?? "professionnel"}.`,
    ``,
    `# PHRASE D'ACCUEIL`,
    `Commence l'appel par : "${phraseAccueil}"`,
    ``,
    `# RÈGLES DE LANGAGE`,
    ...regles.map((r) => `- ${fill(r, config)}`),
    ``,
    `# QUESTIONS SPÉCIFIQUES À CE MÉTIER (${config.metier})`,
    ...questionsSpecifiques.map((q) => `- ${q}`),
    ``,
    `# INFORMATIONS DU CABINET (réponds directement à ces questions, sans transférer)`,
    `- Cabinet : ${config.nomCabinet}`,
    `- Professionnel : ${config.nomProfessionnel}${config.specialite ? ` (${config.specialite})` : ""}`,
    `- Adresse : ${config.adresse ?? "non renseignée"}`,
    `- Horaires : ${config.horairesOuverture}`,
    faqLignes ? `Autres informations pratiques :\n${faqLignes}` : ``,
    ``,
    `# DÉROULÉ DE LA CONVERSATION`,
    ...Object.values(deroule).map((s) => `- ${fill(String(s), config)}`),
    ``,
    `# GESTION DES URGENCES`,
    urgences.principe ?? "",
    urgences.note_metier_sante && (config.metier === "medecin" || config.metier === "chirurgien")
      ? `IMPORTANT SANTÉ : ${urgences.note_metier_sante}`
      : "",
    ``,
    `# ANNULATION / REPORT`,
    annulation.principe ?? "",
    ...(annulation.etapes ?? []).map((s: string) => `- ${s}`),
    ``,
    `# HORS HORAIRES`,
    ...(horsHoraires.regles ?? []).map((s: string) => `- ${fill(String(s), config)}`),
    ``,
    `# GARDE-FOUS (à respecter absolument)`,
    ...gardeFous.map((g) => `- ${g}`),
    ``,
    `# NUMÉRO DE TRANSFERT`,
    `En cas de transfert, utilise le numéro : ${config.numeroTransfertHumain ?? "(non configuré)"}.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Remplace les {{variables}} du prompt par les valeurs du cabinet. */
function fill(text: string, config: AgentConfig): string {
  return text
    .replace(/\{\{nom_cabinet\}\}/g, config.nomCabinet)
    .replace(/\{\{nom_professionnel\}\}/g, config.nomProfessionnel)
    .replace(/\{\{phrase_accueil\}\}/g, config.phraseAccueil)
    .replace(/\{\{horaires_ouverture\}\}/g, config.horairesOuverture)
    .replace(/\{\{numero_transfert_humain\}\}/g, config.numeroTransfertHumain ?? "")
    .replace(/\{\{langue\}\}/g, config.langue)
    .replace(/\{\{delai_min_avant_rdv_heures\}\}/g, String(config.delaiMinAvantRdvHeures));
}

/**
 * Définitions des tools au format "function calling" (OpenAI-compatible),
 * dérivées du bloc "tools" du prompt JSON.
 */
export function getToolSchemas(promptJson: PromptJson) {
  const tools = promptJson.tools ?? {};
  return Object.entries(tools)
    .filter(([name]) => !name.startsWith("_"))
    .map(([name, def]: [string, any]) => ({
      type: "function" as const,
      function: {
        name,
        description: def.description ?? "",
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            (def.params ?? []).map((p: string) => [p, { type: "string" }]),
          ),
          required: def.params ?? [],
        },
      },
    }));
}

export const METIERS: Metier[] = ["medecin", "chirurgien", "avocat", "entrepreneur"];
