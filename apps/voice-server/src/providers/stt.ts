// Reconnaissance vocale (Speech-To-Text) — interface pluggable.
// Adaptateur réel : Deepgram (streaming, fr-FR). Adaptateur mock : sans dépendance.

import { config, isReal } from "../config.js";

export interface Transcriber {
  /** Pousse un chunk audio (μ-law 8kHz depuis Twilio). */
  pushAudio(chunk: Buffer): void;
  close(): void;
}

export interface TranscriberOptions {
  /** Appelé quand une phrase finale est reconnue. */
  onFinal: (text: string) => void;
  /** Appelé pour les résultats partiels (optionnel, utile pour couper la parole). */
  onPartial?: (text: string) => void;
}

export function createTranscriber(opts: TranscriberOptions): Transcriber {
  if (isReal()) return createDeepgramTranscriber(opts);
  return createMockTranscriber(opts);
}

/** Deepgram live streaming (chargé dynamiquement pour ne pas exiger le SDK en mode mock). */
function createDeepgramTranscriber(opts: TranscriberOptions): Transcriber {
  let socket: any;
  let ready = false;
  const backlog: Buffer[] = [];

  (async () => {
    const { createClient, LiveTranscriptionEvents } = await import("@deepgram/sdk");
    const dg = createClient(config.deepgram.apiKey);
    socket = dg.listen.live({
      model: config.deepgram.model,
      language: config.deepgram.language,
      encoding: "mulaw",
      sample_rate: 8000,
      smart_format: true,
      interim_results: true,
    });
    socket.on(LiveTranscriptionEvents.Open, () => {
      ready = true;
      backlog.forEach((b) => socket.send(b));
      backlog.length = 0;
    });
    socket.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const alt = data.channel?.alternatives?.[0];
      const text = alt?.transcript ?? "";
      if (!text) return;
      if (data.is_final) opts.onFinal(text);
      else opts.onPartial?.(text);
    });
  })().catch((e) => console.error("[stt] Deepgram init error:", e));

  return {
    pushAudio(chunk) {
      if (ready && socket) socket.send(chunk);
      else backlog.push(chunk);
    },
    close() {
      try {
        socket?.finish?.();
      } catch {}
    },
  };
}

/** Mock : ne transcrit rien réellement (l'audio de test est injecté par la simulation). */
function createMockTranscriber(_opts: TranscriberOptions): Transcriber {
  return {
    pushAudio() {
      /* no-op en mode mock */
    },
    close() {},
  };
}
