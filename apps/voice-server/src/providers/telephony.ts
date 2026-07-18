// Utilitaires téléphonie : TwiML, transfert d'appel, encodage audio μ-law (G.711).
// La téléphonie repose sur Twilio (opérateur) — indispensable même en stack "maison".

import { config } from "../config.js";

/**
 * TwiML renvoyé au décrochage : on connecte l'appel à notre moteur vocal
 * via un flux Media Stream bidirectionnel (WebSocket).
 */
export function connectStreamTwiml(publicWsUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${publicWsUrl}" />
  </Connect>
</Response>`;
}

/** TwiML de transfert vers un humain (utilisé par le tool transfer_call). */
export function dialTransferTwiml(destination: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Je vous mets en relation, ne quittez pas.</Say>
  <Dial>${destination}</Dial>
</Response>`;
}

/**
 * Transfère un appel en cours vers un humain en mettant à jour l'appel Twilio.
 * En mode mock, on journalise simplement.
 */
export async function transferCall(callSid: string, destination: string): Promise<void> {
  if (config.mode !== "real") {
    console.log(`[telephony:mock] Transfert de ${callSid} vers ${destination}`);
    return;
  }
  const twilioModule: any = await import("twilio");
  const client = twilioModule.default(config.twilio.accountSid, config.twilio.authToken);
  await client.calls(callSid).update({ twiml: dialTransferTwiml(destination) });
}

// --- Encodage PCM 16 bits -> μ-law 8 bits (G.711) attendu par Twilio ---
const MU_LAW_BIAS = 0x84;
const MU_LAW_CLIP = 32635;

export function pcm16ToMulaw(pcm: Buffer): Buffer {
  const out = Buffer.alloc(Math.floor(pcm.length / 2));
  for (let i = 0; i < out.length; i++) {
    let sample = pcm.readInt16LE(i * 2);
    const sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > MU_LAW_CLIP) sample = MU_LAW_CLIP;
    sample += MU_LAW_BIAS;
    let exponent = 7;
    for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1) {}
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    out[i] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
  return out;
}
