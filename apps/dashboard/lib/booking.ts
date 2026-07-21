// Réservation en ligne et annulation en un clic :
// - créneaux proposés sur la page publique (agenda Google si connecté, sinon créneaux types) ;
// - lien d'annulation sécurisé par HMAC inclus dans les SMS de confirmation et de rappel.

import { createHmac } from "node:crypto";
import type { Agent } from "@prisma/client";
import { creneauxLibres, googleConnecte } from "./google";
import { APP_URL } from "./stripe";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";

/** Créneaux types des prochains jours ouvrés (sans agenda connecté). */
export function creneauxParDefaut(max = 9): string[] {
  const out: string[] = [];
  const heures = ["9h30", "14h30", "16h00"];
  const d = new Date();
  for (let i = 1; out.length < max && i < 15; i++) {
    const jour = new Date(d.getTime() + i * 86400000);
    const dow = jour.getDay();
    if (dow === 0 || dow === 6) continue;
    for (const h of heures) {
      if (out.length >= max) break;
      out.push(
        `${jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${h}`,
      );
    }
  }
  return out;
}

/** Créneaux proposés sur la page publique de réservation. */
export async function creneauxPourReservation(agent: Agent): Promise<string[]> {
  if (googleConnecte(agent)) {
    const libres = await creneauxLibres(agent, 9);
    if (libres && libres.length > 0) return libres;
  }
  return creneauxParDefaut();
}

/** Signature d'annulation liée à un rendez-vous précis. */
export function cancelSignature(rdvId: string): string {
  return createHmac("sha256", SECRET).update(`cancel:${rdvId}`).digest("hex").slice(0, 32);
}

export function cancelUrl(rdvId: string): string {
  return `${APP_URL}/rdv/${rdvId}?t=${cancelSignature(rdvId)}`;
}

export function verifyCancelSignature(rdvId: string, t: string): boolean {
  return Boolean(t) && cancelSignature(rdvId) === t;
}
