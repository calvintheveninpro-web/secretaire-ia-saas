// Intégration Google Calendar (OAuth 2.0, API REST, sans SDK).
// Nécessite GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans l'environnement.
// Sans ces variables, le connecteur reste en mode déclaratif et les créneaux
// proposés par l'IA restent les créneaux par défaut.

import { createHmac } from "node:crypto";
import { prisma } from "./db";
import type { Agent } from "@prisma/client";
import { APP_URL } from "./stripe";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

export function googleConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function redirectUri() {
  return `${APP_URL}/api/google/callback`;
}

/** État signé (HMAC) pour lier le retour OAuth au cabinet, sans stockage serveur. */
export function signState(tenantId: string): string {
  const sig = createHmac("sha256", SECRET).update(tenantId).digest("hex");
  return `${tenantId}.${sig}`;
}

export function verifyState(state: string): string | null {
  const idx = state.lastIndexOf(".");
  if (idx < 0) return null;
  const tenantId = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(tenantId).digest("hex");
  return sig === expected ? tenantId : null;
}

export function authUrl(tenantId: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: signState(tenantId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
};

export async function exchangeCode(code: string): Promise<Tokens | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
  };
}

export function googleConnecte(agent: Agent): boolean {
  return Boolean(agent.googleTokensJson);
}

/** Renvoie un access token valide, en rafraîchissant si nécessaire. */
async function accessToken(agent: Agent): Promise<string | null> {
  if (!agent.googleTokensJson) return null;
  let tokens: Tokens;
  try {
    tokens = JSON.parse(agent.googleTokensJson);
  } catch {
    return null;
  }
  if (tokens.expires_at > Date.now()) return tokens.access_token;
  if (!tokens.refresh_token || !googleConfigured()) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  const suivant: Tokens = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
  };
  await prisma.agent.update({
    where: { id: agent.id },
    data: { googleTokensJson: JSON.stringify(suivant) },
  });
  return suivant.access_token;
}

/**
 * Créneaux réellement libres dans l'agenda Google : on part des créneaux types
 * des prochains jours ouvrés et on écarte ceux qui chevauchent un événement.
 */
export async function creneauxLibres(agent: Agent): Promise<string[] | null> {
  const token = await accessToken(agent);
  if (!token) return null;

  const candidats: { date: Date; label: string }[] = [];
  const heures = [
    { h: 9, m: 30, label: "9h30" },
    { h: 14, m: 30, label: "14h30" },
    { h: 16, m: 0, label: "16h00" },
  ];
  const maintenant = new Date();
  for (let i = 1; candidats.length < 15 && i < 12; i++) {
    const jour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
    const dow = jour.getDay();
    if (dow === 0 || dow === 6) continue;
    for (const { h, m, label } of heures) {
      const date = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), h, m);
      candidats.push({
        date,
        label: `${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${label}`,
      });
    }
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: candidats[0].date.toISOString(),
      timeMax: new Date(candidats[candidats.length - 1].date.getTime() + 3600000).toISOString(),
      items: [{ id: agent.googleCalendarId || "primary" }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const occupes: { start: string; end: string }[] =
    data?.calendars?.[agent.googleCalendarId || "primary"]?.busy ?? [];

  const dureeMs = (agent.dureeRdvParDefautMin || 30) * 60000;
  const libres = candidats.filter(({ date }) => {
    const debut = date.getTime();
    const fin = debut + dureeMs;
    return !occupes.some((b) => {
      const bDebut = new Date(b.start).getTime();
      const bFin = new Date(b.end).getTime();
      return debut < bFin && fin > bDebut;
    });
  });

  return libres.slice(0, 3).map((c) => c.label);
}

/** Crée l'événement du rendez-vous dans l'agenda Google. Renvoie l'identifiant ou null. */
export async function creerEvenement(
  agent: Agent,
  rdv: { titre: string; description: string; dateHeure: string; dureeMin: number },
): Promise<string | null> {
  const token = await accessToken(agent);
  if (!token) return null;

  const debut = new Date(rdv.dateHeure.trim().replace(" ", "T"));
  if (isNaN(debut.getTime())) return null;
  const fin = new Date(debut.getTime() + rdv.dureeMin * 60000);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agent.googleCalendarId || "primary")}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: rdv.titre,
        description: rdv.description,
        start: { dateTime: debut.toISOString() },
        end: { dateTime: fin.toISOString() },
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.id ?? null;
}
