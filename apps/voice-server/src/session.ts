// Orchestration d'un appel : relie reconnaissance vocale -> LLM (+ tools) -> synthèse vocale.
// Une instance de CallSession par appel entrant.

import { buildSystemPrompt, getToolSchemas } from "@secretaire-ia/shared";
import type { AgentConfig, ToolName, TranscriptTurn } from "@secretaire-ia/shared";
import { createTranscriber, type Transcriber } from "./providers/stt.js";
import { synthesize } from "./providers/tts.js";
import { runTurn, type LlmMessage } from "./providers/llm.js";
import { transferCall } from "./providers/telephony.js";
import { executeTool, saveCall } from "./dashboard-api.js";

export interface CallSessionDeps {
  agent: AgentConfig;
  promptJson: Record<string, any>;
  callSid: string;
  fromNumber: string;
  /** Envoie de l'audio μ-law au flux Twilio (ou à la simulation). */
  sendAudio: (mulaw: Buffer) => void;
  /** Termine l'appel. */
  hangup: () => void;
}

export class CallSession {
  private messages: LlmMessage[] = [];
  private systemPrompt: string;
  private tools: any[];
  private transcript: TranscriptTurn[] = [];
  private transcriber: Transcriber;
  private startedAt = new Date().toISOString();
  private outcome: "rdv_pris" | "transfere" | "message" | "info" | "abandonne" = "info";
  private ended = false;

  constructor(private deps: CallSessionDeps) {
    this.systemPrompt = buildSystemPrompt(deps.agent, deps.promptJson);
    this.tools = getToolSchemas(deps.promptJson);
    this.transcriber = createTranscriber({
      onFinal: (text) => this.onCallerSpeech(text),
    });
  }

  /** Démarre l'appel en jouant la phrase d'accueil. */
  async start() {
    await this.speak(this.deps.agent.phraseAccueil);
  }

  /** Audio entrant depuis Twilio (μ-law 8kHz). */
  pushAudio(chunk: Buffer) {
    this.transcriber.pushAudio(chunk);
  }

  /** Injection directe d'un tour parlé (utilisé par la simulation hors-ligne). */
  async injectCallerText(text: string) {
    await this.onCallerSpeech(text);
  }

  private async onCallerSpeech(text: string) {
    if (this.ended || !text.trim()) return;
    this.record("caller", text);
    this.messages.push({ role: "user", content: text });
    await this.runAgentTurns();
  }

  /** Boucle : le LLM répond, exécute des tools, puis reparle — jusqu'à stabilisation. */
  private async runAgentTurns(depth = 0) {
    if (depth > 6) return; // garde-fou anti-boucle
    const turn = await runTurn({ systemPrompt: this.systemPrompt, messages: this.messages, tools: this.tools });

    if (turn.text) {
      this.messages.push({ role: "assistant", content: turn.text });
      await this.speak(turn.text);
    }

    for (const call of turn.toolCalls) {
      const handled = await this.handleSpecialTool(call.name as ToolName, call.args);
      if (handled) return;
      const result = await executeTool(this.deps.agent.tenantId, this.deps.callSid, {
        name: call.name as ToolName,
        args: call.args,
      });
      this.messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify(result),
      });
      if (call.name === "book_appointment" && result.ok) this.outcome = "rdv_pris";
    }

    if (turn.toolCalls.length > 0) await this.runAgentTurns(depth + 1);
  }

  /** Tools qui agissent sur l'appel lui-même (transfert, raccrocher). */
  private async handleSpecialTool(name: ToolName, args: Record<string, unknown>): Promise<boolean> {
    if (name === "transfer_call") {
      this.outcome = "transfere";
      const dest = (args.numero_destination as string) || this.deps.agent.numeroTransfertHumain || "";
      await transferCall(this.deps.callSid, dest);
      await this.end();
      return true;
    }
    if (name === "end_call") {
      await this.end();
      return true;
    }
    if (name === "take_message") this.outcome = "message";
    return false;
  }

  private async speak(text: string) {
    this.record("agent", text);
    const audio = await synthesize(text);
    if (audio.mulaw.length > 0) this.deps.sendAudio(audio.mulaw);
  }

  private record(role: "caller" | "agent", text: string) {
    this.transcript.push({ role, text, at: new Date().toISOString() });
  }

  async end() {
    if (this.ended) return;
    this.ended = true;
    this.transcriber.close();
    await saveCall({
      tenantId: this.deps.agent.tenantId,
      fromNumber: this.deps.fromNumber,
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
      outcome: this.outcome,
      transcript: this.transcript,
    });
    this.deps.hangup();
  }

  getTranscript() {
    return this.transcript;
  }
}
