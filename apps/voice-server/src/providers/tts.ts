// Synthèse vocale (Text-To-Speech) — interface pluggable.
// Adaptateur réel : ElevenLabs (voix française). Sortie au format μ-law 8kHz pour Twilio.

import { config, isReal } from "../config.js";
import { pcm16ToMulaw } from "./telephony.js";

export interface SynthesizedAudio {
  /** Audio μ-law 8kHz, prêt à être renvoyé sur le flux Twilio. */
  mulaw: Buffer;
  text: string;
}

export async function synthesize(text: string): Promise<SynthesizedAudio> {
  if (isReal()) return synthesizeElevenLabs(text);
  return { mulaw: Buffer.alloc(0), text };
}

async function synthesizeElevenLabs(text: string): Promise<SynthesizedAudio> {
  // Demande un PCM 16 bits à 8kHz, puis conversion en μ-law pour Twilio.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.tts.voiceId}?output_format=pcm_8000`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": config.tts.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/pcm",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    console.error("[tts] ElevenLabs error:", res.status, await res.text());
    return { mulaw: Buffer.alloc(0), text };
  }
  const pcm = Buffer.from(await res.arrayBuffer());
  return { mulaw: pcm16ToMulaw(pcm), text };
}
