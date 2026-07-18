// Cerveau (LLM) — interface pluggable.
// Adaptateur réel : OpenAI (function calling). Adaptateur mock : moteur à règles
// qui suit le déroulé du prompt (permet de tourner et de démontrer sans clé API).

import { config, isReal } from "../config.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LlmTurnResult {
  text: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
}

export interface LlmTurnInput {
  systemPrompt: string;
  messages: LlmMessage[];
  tools: any[];
}

export async function runTurn(input: LlmTurnInput): Promise<LlmTurnResult> {
  if (isReal()) return runOpenAiTurn(input);
  return runMockTurn(input);
}

async function runOpenAiTurn(input: LlmTurnInput): Promise<LlmTurnResult> {
  const OpenAI: any = (await import("openai")).default;
  const client = new OpenAI({ apiKey: config.llm.apiKey });
  const res = await client.chat.completions.create({
    model: config.llm.model,
    temperature: 0.5,
    messages: [{ role: "system", content: input.systemPrompt }, ...input.messages],
    tools: input.tools,
    tool_choice: "auto",
  });
  const choice = res.choices[0].message;
  const toolCalls = (choice.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    args: safeParse(tc.function.arguments),
  }));
  return { text: choice.content ?? "", toolCalls };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/**
 * Mock rule-based : suit une conversation de prise de RDV réaliste.
 * Sert de démonstration et de test hors-ligne du pipeline.
 */
function runMockTurn(input: LlmTurnInput): LlmTurnResult {
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content?.toLowerCase() ?? "";
  const history = input.messages.filter((m) => m.role === "user").length;

  // Détection d'urgence -> transfert.
  if (/urgen|malaise|douleur|sang|respir|c'est grave/.test(lastUser)) {
    return {
      text: "Je comprends, c'est urgent. Si c'est une urgence vitale, raccrochez et appelez le 15. Je vous mets en relation avec le cabinet immédiatement, ne quittez pas.",
      toolCalls: [{ id: "t1", name: "transfer_call", args: { numero_destination: "humain" } }],
    };
  }

  switch (history) {
    case 1:
      return { text: "Avec plaisir. Puis-je avoir votre nom et votre prénom, s'il vous plaît ?", toolCalls: [] };
    case 2:
      return { text: "Merci. Êtes-vous déjà patient du cabinet, ou est-ce un premier rendez-vous ?", toolCalls: [] };
    case 3:
      return { text: "Très bien. Pouvez-vous me dire brièvement le motif de votre rendez-vous ?", toolCalls: [] };
    case 4:
      return {
        text: "Je regarde les disponibilités.",
        toolCalls: [{ id: "t2", name: "check_availability", args: { date_debut: "demain", date_fin: "+7j" } }],
      };
    case 5:
      return { text: "Je vous propose mardi à 14h30 ou jeudi à 10h. Quel créneau vous convient le mieux ?", toolCalls: [] };
    case 6:
      return {
        text: "Parfait, je confirme votre rendez-vous.",
        toolCalls: [{ id: "t3", name: "book_appointment", args: { date_heure: "mardi 14:30" } }],
      };
    default:
      return {
        text: "C'est noté, vous recevrez une confirmation par SMS. Bonne journée !",
        toolCalls: [{ id: "t4", name: "end_call", args: {} }],
      };
  }
}
