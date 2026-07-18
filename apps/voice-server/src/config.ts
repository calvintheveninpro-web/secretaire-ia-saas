// Configuration du moteur vocal, lue depuis les variables d'environnement.

export const config = {
  mode: (process.env.PROVIDER_MODE ?? "mock") as "mock" | "real",
  port: Number(process.env.VOICE_SERVER_PORT ?? 8080),
  dashboardApiUrl: process.env.DASHBOARD_API_URL ?? "http://localhost:3000",

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY ?? "",
    language: "fr",
    model: "nova-2",
  },
  llm: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gpt-4o",
  },
  tts: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
  },
};

export function isReal() {
  return config.mode === "real";
}
