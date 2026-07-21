// Envoi de SMS via Twilio quand les identifiants sont configurés
// (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).
// Sans identifiants, le SMS est journalisé en mode « simulé » : le contenu
// apparaît dans l'onglet Messages du tableau de bord, rien n'est envoyé.

import { prisma } from "./db";

const SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const FROM = process.env.TWILIO_FROM_NUMBER ?? "";

export function smsConfigured() {
  return Boolean(SID && TOKEN && FROM);
}

export type TypeMessage = "confirmation" | "rappel" | "alerte" | "paiement" | "notification";

/** Envoie un SMS (ou le simule) et le journalise dans la table Message. */
export async function sendSms(
  tenantId: string,
  destinataire: string,
  contenu: string,
  type: TypeMessage,
): Promise<{ statut: "envoye" | "simule" | "echec" }> {
  let statut: "envoye" | "simule" | "echec" = "simule";

  if (smsConfigured() && destinataire) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: destinataire, From: FROM, Body: contenu }),
        },
      );
      statut = res.ok ? "envoye" : "echec";
    } catch {
      statut = "echec";
    }
  }

  await prisma.message.create({
    data: { tenantId, canal: "sms", destinataire, contenu, type, statut },
  });
  return { statut };
}

/** Journalise une alerte interne (visible dans l'onglet Messages, sans envoi). */
export async function recordAlert(tenantId: string, contenu: string, destinataire = "cabinet") {
  await prisma.message.create({
    data: { tenantId, canal: "interne", destinataire, contenu, type: "alerte", statut: "envoye" },
  });
}
