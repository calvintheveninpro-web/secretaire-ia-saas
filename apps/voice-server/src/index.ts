// Moteur vocal — serveur HTTP (webhook Twilio) + WebSocket (Twilio Media Streams).
//
//   Appel entrant → Twilio POST /voice → TwiML <Connect><Stream wss://…/media>
//   → flux audio bidirectionnel géré par CallSession (STT → LLM+tools → TTS).

import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { CallSession } from "./session.js";
import { fetchAgentByNumber } from "./dashboard-api.js";

const promptJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../prompt/secretaire-ia-prompt.json", import.meta.url)), "utf8"),
);

const PUBLIC_WS_URL =
  process.env.PUBLIC_WS_URL ?? `wss://localhost:${config.port}/media`; // en local : expose via un tunnel (ngrok, cloudflared)

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url?.startsWith("/voice")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const to = params.get("To") ?? config.twilio.phoneNumber;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${PUBLIC_WS_URL}">
      <Parameter name="to" value="${to}" />
    </Stream>
  </Connect>
</Response>`;
      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(twiml);
    });
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: "/media" });

wss.on("connection", (ws) => {
  let session: CallSession | null = null;
  let streamSid = "";

  const sendAudio = (mulaw: Buffer) => {
    ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: mulaw.toString("base64") } }));
  };

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    switch (msg.event) {
      case "start": {
        streamSid = msg.start.streamSid;
        const to = msg.start.customParameters?.to ?? config.twilio.phoneNumber;
        const callSid = msg.start.callSid;
        const agent = await fetchAgentByNumber(to);
        session = new CallSession({
          agent,
          promptJson,
          callSid,
          fromNumber: msg.start.customParameters?.from ?? "inconnu",
          sendAudio,
          hangup: () => ws.close(),
        });
        await session.start();
        break;
      }
      case "media":
        session?.pushAudio(Buffer.from(msg.media.payload, "base64"));
        break;
      case "stop":
        await session?.end();
        break;
    }
  });

  ws.on("close", () => session?.end());
});

server.listen(config.port, () => {
  console.log(`[voice-server] mode=${config.mode} — écoute sur http://localhost:${config.port}`);
  console.log(`[voice-server] Webhook Twilio Voice : POST http://<public>/voice`);
});
